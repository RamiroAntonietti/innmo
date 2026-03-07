import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min } from 'class-validator';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';

enum TipoServicio { LUZ='LUZ', GAS='GAS', AGUA='AGUA', INTERNET='INTERNET', EXPENSAS='EXPENSAS', TELEFONO='TELEFONO', OTRO='OTRO' }

export class CreateFacturaDto {
  @IsString() propiedadId: string;
  @IsEnum(TipoServicio) tipoServicio: TipoServicio;
  @IsNumber() @Min(0.01, { message: 'El monto debe ser mayor que 0.' }) monto: number;
  @IsDateString() fechaVence: string;
  @IsString() @IsOptional() notas?: string;
}

export class UpdateFacturaDto {
  @IsEnum(TipoServicio) @IsOptional() tipoServicio?: TipoServicio;
  @IsNumber() @IsOptional() @Min(0.01) monto?: number;
  @IsDateString() @IsOptional() fechaVence?: string;
  @IsEnum(['PENDIENTE','PAGADO','VENCIDO']) @IsOptional() estado?: string;
  @IsString() @IsOptional() notas?: string;
}

@Injectable()
export class FacturasService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll(tenantId: string, query: any) {
    const { propiedadId, estado, page = 1, limit = 50 } = query;
    const where: any = { tenantId };
    if (propiedadId) where.propiedadId = propiedadId;
    if (estado) where.estado = estado;

    // Auto-actualizar vencidas antes de devolver
    await this.actualizarVencidas(tenantId);

    const [data, total] = await Promise.all([
      this.prisma.facturaServicio.findMany({
        where, skip: (Number(page)-1)*Number(limit), take: Number(limit),
        include: { propiedad: { select: { titulo: true, direccion: true } } },
        orderBy: { fechaVence: 'asc' },
      }),
      this.prisma.facturaServicio.count({ where }),
    ]);
    return { data, total };
  }

  async getProximas(tenantId: string) {
    const en7dias = new Date();
    en7dias.setDate(en7dias.getDate() + 7);
    return this.prisma.facturaServicio.findMany({
      where: {
        tenantId,
        estado: 'PENDIENTE',
        fechaVence: { lte: en7dias, gte: new Date() },
      },
      include: { propiedad: { select: { titulo: true } } },
      orderBy: { fechaVence: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateFacturaDto, usuarioId?: string) {
    // Validar fecha de vencimiento
    const fechaVence = new Date(dto.fechaVence);
    if (isNaN(fechaVence.getTime())) throw new BadRequestException('Fecha de vencimiento inválida.');

    // Validar propiedad
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: dto.propiedadId, tenantId, deletedAt: null },
    });
    if (!propiedad) throw new NotFoundException('Propiedad no encontrada.');

    // Estado inicial: si ya venció, crear como VENCIDO
    const estado = fechaVence < new Date() ? 'VENCIDO' : 'PENDIENTE';

    const factura = await this.prisma.facturaServicio.create({
      data: {
        tenantId, propiedadId: dto.propiedadId,
        tipoServicio: dto.tipoServicio, monto: dto.monto,
        fechaVence, estado: estado as any, notas: dto.notas,
      },
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'CREATE', entidad: 'factura',
      entidadId: factura.id, detalle: { tipo: dto.tipoServicio, monto: dto.monto },
    });

    return factura;
  }

  async update(tenantId: string, id: string, dto: UpdateFacturaDto, usuarioId?: string) {
    const factura = await this.prisma.facturaServicio.findFirst({ where: { id, tenantId } });
    if (!factura) throw new NotFoundException('Factura no encontrada.');

    // No se puede modificar una factura pagada excepto para agregar notas
    if (factura.estado === 'PAGADO' && (dto.monto || dto.fechaVence || dto.tipoServicio)) {
      throw new BadRequestException('No se puede modificar una factura ya pagada.');
    }

    const updated = await this.prisma.facturaServicio.update({
      where: { id },
      data: { ...dto, fechaVence: dto.fechaVence ? new Date(dto.fechaVence) : undefined } as any,
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'UPDATE', entidad: 'factura', entidadId: id, detalle: dto,
    });

    return updated;
  }

  async pagar(tenantId: string, id: string, usuarioId?: string) {
    const factura = await this.prisma.facturaServicio.findFirst({ where: { id, tenantId } });
    if (!factura) throw new NotFoundException('Factura no encontrada.');
    if (factura.estado === 'PAGADO') throw new BadRequestException('La factura ya está pagada.');

    const updated = await this.prisma.facturaServicio.update({
      where: { id }, data: { estado: 'PAGADO' as any },
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'PAGO', entidad: 'factura', entidadId: id,
    });

    return updated;
  }

  async remove(tenantId: string, id: string, usuarioId?: string) {
    const factura = await this.prisma.facturaServicio.findFirst({ where: { id, tenantId } });
    if (!factura) throw new NotFoundException('Factura no encontrada.');

    await this.prisma.facturaServicio.delete({ where: { id } });

    await this.audit.log({
      tenantId, usuarioId, accion: 'DELETE', entidad: 'factura', entidadId: id,
    });

    return { message: 'Factura eliminada.' };
  }

  // Cron: ejecutar cada hora para actualizar facturas vencidas
  @Cron(CronExpression.EVERY_HOUR)
  async actualizarTodasVencidas() {
    try {
      await this.prisma.facturaServicio.updateMany({
        where: { estado: 'PENDIENTE', fechaVence: { lt: new Date() } },
        data: { estado: 'VENCIDO' as any },
      });
    } catch (e) {
      console.error('Error actualizando facturas vencidas:', e.message);
    }
  }

  private async actualizarVencidas(tenantId: string) {
    await this.prisma.facturaServicio.updateMany({
      where: { tenantId, estado: 'PENDIENTE', fechaVence: { lt: new Date() } },
      data: { estado: 'VENCIDO' as any },
    });
  }
}

@Controller('facturas')
@UseGuards(JwtAuthGuard)
export class FacturasController {
  constructor(private svc: FacturasService) {}

  @Get() findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Get('proximas') proximas(@TenantId() tid: string) { return this.svc.getProximas(tid); }

  @Post()
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  create(@TenantId() tid: string, @Body() dto: CreateFacturaDto, @CurrentUser('sub') uid: string) {
    return this.svc.create(tid, dto, uid);
  }

  @Put(':id')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateFacturaDto, @CurrentUser('sub') uid: string) {
    return this.svc.update(tid, id, dto, uid);
  }

  @Put(':id/pagar')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  pagar(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) {
    return this.svc.pagar(tid, id, uid);
  }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) {
    return this.svc.remove(tid, id, uid);
  }
}

@Module({ imports: [AuditModule], providers: [FacturasService], controllers: [FacturasController] })
export class FacturasModule {}
