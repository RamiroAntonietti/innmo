import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';
import { AuditModule } from '../audit/audit.module';
import { RentalsModule, RentalsService } from '../rentals/rentals.module';
import { generarCodigo, PREFIJOS } from '../common/utils/codigo.util';

enum TipoPresupuesto { ALQUILER = 'ALQUILER', VENTA = 'VENTA' }
enum EstadoPresupuesto { BORRADOR = 'BORRADOR', ENVIADO = 'ENVIADO', ACEPTADO = 'ACEPTADO', RECHAZADO = 'RECHAZADO' }

class PropiedadMontoDto {
  @IsString() propiedadId: string;
  @IsNumber() @Min(0.01) monto: number;
}

export class CreatePresupuestoDto {
  @IsString() clienteId: string;
  @IsEnum(TipoPresupuesto) tipo: TipoPresupuesto;
  @IsNumber() @Min(0.01) montoTotal: number;
  @IsDateString() vigenciaHasta: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => PropiedadMontoDto) propiedades: PropiedadMontoDto[];
  @IsString() @IsOptional() notas?: string;
}

export class UpdatePresupuestoDto {
  @IsEnum(EstadoPresupuesto) @IsOptional() estado?: EstadoPresupuesto;
  @IsString() @IsOptional() notas?: string;
}

export class ConvertirAlquilerDto {
  @IsString() propiedadId: string;
  @IsDateString() fechaInicio: string;
  @IsDateString() fechaFin: string;
  @IsNumber() @Min(1) montoMensual: number;
  @IsNumber() @IsOptional() @Min(0) deposito?: number;
}

export class ConvertirVentaDto {
  @IsString() propiedadId: string;
  @IsNumber() @Min(0.01) precioFinal: number;
  @IsNumber() @Min(0) comision: number;
}

@Injectable()
export class PresupuestosService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private rentalsService: RentalsService,
  ) {}

  async findAll(tenantId: string, query: any) {
    const { clienteId, estado, tipo, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (clienteId) where.clienteId = clienteId;
    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;

    const [data, total] = await Promise.all([
      this.prisma.presupuesto.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          cliente: { select: { nombre: true, apellido: true, email: true } },
          propiedades: { include: { propiedad: { select: { id: true, titulo: true, direccion: true, ciudad: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.presupuesto.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.prisma.presupuesto.findFirst({
      where: { id, tenantId },
      include: {
        cliente: true,
        propiedades: { include: { propiedad: { include: { propietario: true } } } },
      },
    });
    if (!p) throw new NotFoundException('Presupuesto no encontrado.');
    return p;
  }

  async create(tenantId: string, dto: CreatePresupuestoDto, usuarioId?: string) {
    const cliente = await this.prisma.cliente.findFirst({ where: { id: dto.clienteId, tenantId, deletedAt: null } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const propiedadIds = dto.propiedades.map((x) => x.propiedadId);
    const propiedades = await this.prisma.propiedad.findMany({
      where: { id: { in: propiedadIds }, tenantId, deletedAt: null },
    });
    if (propiedades.length !== propiedadIds.length) {
      throw new BadRequestException('Una o más propiedades no existen.');
    }

    const codigo = generarCodigo(PREFIJOS.PRESUPUESTO);
    const presupuesto = await this.prisma.presupuesto.create({
      data: {
        tenantId,
        codigo,
        clienteId: dto.clienteId,
        tipo: dto.tipo,
        montoTotal: dto.montoTotal,
        vigenciaHasta: new Date(dto.vigenciaHasta),
        notas: dto.notas,
        propiedades: {
          create: dto.propiedades.map((x) => ({ propiedadId: x.propiedadId, monto: x.monto })),
        },
      },
      include: {
        cliente: { select: { nombre: true, apellido: true } },
        propiedades: { include: { propiedad: { select: { titulo: true } } } },
      },
    });

    await this.audit.log({
      tenantId,
      usuarioId,
      accion: 'CREATE',
      entidad: 'presupuesto',
      entidadId: presupuesto.id,
      detalle: { cliente: `${cliente.nombre} ${cliente.apellido}`, tipo: dto.tipo, montoTotal: dto.montoTotal },
    });
    return presupuesto;
  }

  async update(tenantId: string, id: string, dto: UpdatePresupuestoDto, usuarioId?: string) {
    await this.findOne(tenantId, id);
    const updated = await this.prisma.presupuesto.update({
      where: { id },
      data: dto,
      include: {
        cliente: true,
        propiedades: { include: { propiedad: true } },
      },
    });
    await this.audit.log({ tenantId, usuarioId, accion: 'UPDATE', entidad: 'presupuesto', entidadId: id, detalle: dto });
    return updated;
  }

  async remove(tenantId: string, id: string, usuarioId?: string) {
    await this.findOne(tenantId, id);
    await this.prisma.presupuesto.delete({ where: { id } });
    await this.audit.log({ tenantId, usuarioId, accion: 'DELETE', entidad: 'presupuesto', entidadId: id });
    return { message: 'Presupuesto eliminado.' };
  }

  async convertirAlquiler(tenantId: string, presupuestoId: string, dto: ConvertirAlquilerDto, usuarioId?: string) {
    const presupuesto = await this.findOne(tenantId, presupuestoId);
    if (presupuesto.estado !== 'ACEPTADO') {
      throw new BadRequestException('Solo se puede convertir un presupuesto con estado ACEPTADO.');
    }
    if (presupuesto.tipo !== 'ALQUILER') {
      throw new BadRequestException('Este presupuesto es de tipo VENTA. Usá "Convertir en venta".');
    }

    const pp = presupuesto.propiedades.find((x) => x.propiedadId === dto.propiedadId);
    if (!pp) throw new BadRequestException('La propiedad no está en este presupuesto.');

    const cliente = await this.prisma.cliente.findFirst({ where: { id: presupuesto.clienteId, tenantId } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    if (cliente.tipo !== 'INQUILINO') {
      throw new BadRequestException('El cliente del presupuesto debe ser de tipo INQUILINO para convertir en contrato de alquiler.');
    }

    const contrato = await this.rentalsService.create(tenantId, {
      propiedadId: dto.propiedadId,
      inquilinoId: presupuesto.clienteId,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      montoMensual: dto.montoMensual,
      deposito: dto.deposito,
    }, usuarioId);

    return { contrato, message: 'Contrato de alquiler creado correctamente.' };
  }

  async convertirVenta(tenantId: string, presupuestoId: string, dto: ConvertirVentaDto, usuarioId?: string) {
    const presupuesto = await this.findOne(tenantId, presupuestoId);
    if (presupuesto.estado !== 'ACEPTADO') {
      throw new BadRequestException('Solo se puede convertir un presupuesto con estado ACEPTADO.');
    }
    if (presupuesto.tipo !== 'VENTA') {
      throw new BadRequestException('Este presupuesto es de tipo ALQUILER. Usá "Convertir en contrato".');
    }

    const pp = presupuesto.propiedades.find((x) => x.propiedadId === dto.propiedadId);
    if (!pp) throw new BadRequestException('La propiedad no está en este presupuesto.');

    const cliente = await this.prisma.cliente.findFirst({ where: { id: presupuesto.clienteId, tenantId } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    if (cliente.tipo !== 'COMPRADOR') {
      throw new BadRequestException('El cliente del presupuesto debe ser de tipo COMPRADOR para convertir en venta.');
    }

    const codigo = generarCodigo(PREFIJOS.VENTA);
    const operacion = await this.prisma.operacionVenta.create({
      data: {
        tenantId,
        codigo,
        propiedadId: dto.propiedadId,
        compradorId: presupuesto.clienteId,
        precioFinal: dto.precioFinal,
        comision: dto.comision,
        estado: 'NEGOCIACION',
      },
      include: { propiedad: true, comprador: true },
    });

    await this.prisma.propiedad.update({
      where: { id: dto.propiedadId },
      data: { estado: 'RESERVADO' },
    });

    await this.audit.log({
      tenantId,
      usuarioId,
      accion: 'CREATE',
      entidad: 'operacion_venta',
      entidadId: operacion.id,
      detalle: { propiedad: operacion.propiedad.titulo, comprador: `${cliente.nombre} ${cliente.apellido}` },
    });

    return { operacion, message: 'Operación de venta creada correctamente.' };
  }
}

@Controller('presupuestos')
@UseGuards(JwtAuthGuard)
export class PresupuestosController {
  constructor(private svc: PresupuestosService) {}

  @Get() findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Get(':id') findOne(@TenantId() tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }

  @Post()
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  create(@TenantId() tid: string, @Body() dto: CreatePresupuestoDto, @CurrentUser('sub') uid: string) {
    return this.svc.create(tid, dto, uid);
  }

  @Put(':id')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdatePresupuestoDto, @CurrentUser('sub') uid: string) {
    return this.svc.update(tid, id, dto, uid);
  }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) {
    return this.svc.remove(tid, id, uid);
  }

  @Post(':id/convertir-alquiler')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  convertirAlquiler(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: ConvertirAlquilerDto,
    @CurrentUser('sub') uid: string,
  ) {
    return this.svc.convertirAlquiler(tid, id, dto, uid);
  }

  @Post(':id/convertir-venta')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  convertirVenta(
    @TenantId() tid: string,
    @Param('id') id: string,
    @Body() dto: ConvertirVentaDto,
    @CurrentUser('sub') uid: string,
  ) {
    return this.svc.convertirVenta(tid, id, dto, uid);
  }
}

@Module({ imports: [AuditModule, RentalsModule], providers: [PresupuestosService], controllers: [PresupuestosController], exports: [PresupuestosService] })
export class PresupuestosModule {}
