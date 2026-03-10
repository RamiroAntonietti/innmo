// PATCH para properties.module.ts
// Agregar en el método create() del PropertiesService, antes de crear la propiedad:
//
//   await this.planService.checkPropertyLimit(tenantId);
//
// Y agregar PlanService en el constructor:
//   constructor(private prisma: PrismaService, private audit: AuditService, private planService: PlanService) {}
//
// En PropertiesModule agregar imports: [PlansModule] y providers: [..., PlanService]
//
// Ejemplo de método create() actualizado:

/*
async create(tenantId: string, dto: CreatePropertyDto, usuarioId?: string) {
  // ── Verificar límite del plan ──────────────────────────────
  await this.planService.checkPropertyLimit(tenantId);

  // ... resto del método igual
}
*/

// ── ARCHIVO COMPLETO ACTUALIZADO ──────────────────────────────────
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsNumber, IsEnum, IsOptional, Min, MinLength } from 'class-validator';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PlanService } from '../plans/plan.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { RequirePlanModule, PlanGuard } from '../common/guards/plan.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';
import { AuditModule } from '../audit/audit.module';
import { PlansModule } from '../plans/plans.module';
import { generarCodigo, PREFIJOS } from '../common/utils/codigo.util';

enum TipoOperacion { VENTA = 'VENTA', ALQUILER = 'ALQUILER' }
enum EstadoPropiedad { DISPONIBLE = 'DISPONIBLE', RESERVADO = 'RESERVADO', VENDIDO = 'VENDIDO', ALQUILADO = 'ALQUILADO' }

export class CreatePropertyDto {
  @IsString() @MinLength(5) titulo: string;
  @IsString() @IsOptional() descripcion?: string;
  @IsString() @MinLength(5) direccion: string;
  @IsString() @MinLength(3) ciudad: string;
  @IsNumber() @Min(1) precio: number;
  @IsEnum(TipoOperacion) tipoOperacion: TipoOperacion;
  @IsEnum(EstadoPropiedad) @IsOptional() estado?: EstadoPropiedad;
  @IsNumber() @IsOptional() @Min(0) dormitorios?: number;
  @IsNumber() @IsOptional() @Min(0) banos?: number;
  @IsNumber() @IsOptional() @Min(10) metrosCuadrados?: number;
  @IsString() @IsOptional() propietarioId?: string;
}

export class UpdatePropertyDto {
  @IsString() @IsOptional() @MinLength(5) titulo?: string;
  @IsString() @IsOptional() descripcion?: string;
  @IsString() @IsOptional() @MinLength(5) direccion?: string;
  @IsString() @IsOptional() @MinLength(3) ciudad?: string;
  @IsNumber() @IsOptional() @Min(1) precio?: number;
  @IsEnum(TipoOperacion) @IsOptional() tipoOperacion?: TipoOperacion;
  @IsEnum(EstadoPropiedad) @IsOptional() estado?: EstadoPropiedad;
  @IsNumber() @IsOptional() @Min(0) dormitorios?: number;
  @IsNumber() @IsOptional() @Min(0) banos?: number;
  @IsNumber() @IsOptional() @Min(10) metrosCuadrados?: number;
  @IsString() @IsOptional() propietarioId?: string;
}

@Injectable()
export class PropertiesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private planService: PlanService,
  ) {}

  async findAll(tenantId: string, query: any) {
    const { search, tipoOperacion, estado, page = 1, limit = 20 } = query;
    const where: any = { tenantId, deletedAt: null };
    if (search) where.OR = [
      { titulo: { contains: search, mode: 'insensitive' } },
      { direccion: { contains: search, mode: 'insensitive' } },
      { ciudad: { contains: search, mode: 'insensitive' } },
    ];
    if (tipoOperacion) where.tipoOperacion = tipoOperacion;
    if (estado) where.estado = estado;

    const [data, total] = await Promise.all([
      this.prisma.propiedad.findMany({
        where, skip: (Number(page) - 1) * Number(limit), take: Number(limit),
        include: { propietario: { select: { nombre: true, apellido: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.propiedad.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.prisma.propiedad.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { propietario: true, imagenes: { orderBy: { orden: 'asc' } } },
    });
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
    return p;
  }

  async create(tenantId: string, dto: CreatePropertyDto, usuarioId?: string) {
    // ── Verificar límite del plan ─────────────────────────────
    await this.planService.checkPropertyLimit(tenantId);

    if (dto.propietarioId) {
      const propietario = await this.prisma.cliente.findFirst({
        where: { id: dto.propietarioId, tenantId, deletedAt: null },
      });
      if (!propietario) throw new BadRequestException('El propietario no existe.');
      if (propietario.tipo !== 'PROPIETARIO')
        throw new BadRequestException('El cliente seleccionado no es de tipo PROPIETARIO.');
    }

    const codigo = generarCodigo(PREFIJOS.PROPIEDAD);
    const propiedad = await this.prisma.propiedad.create({ data: { ...dto, tenantId, codigo } });

    await this.audit.log({
      tenantId, usuarioId, accion: 'CREATE', entidad: 'propiedad',
      entidadId: propiedad.id, detalle: { titulo: dto.titulo },
    });

    return propiedad;
  }

  async update(tenantId: string, id: string, dto: UpdatePropertyDto, usuarioId?: string) {
    await this.findOne(tenantId, id);

    if (dto.propietarioId) {
      const propietario = await this.prisma.cliente.findFirst({
        where: { id: dto.propietarioId, tenantId, deletedAt: null },
      });
      if (!propietario) throw new BadRequestException('El propietario no existe.');
      if (propietario.tipo !== 'PROPIETARIO')
        throw new BadRequestException('El cliente seleccionado no es de tipo PROPIETARIO.');
    }

    const propiedad = await this.prisma.propiedad.update({ where: { id }, data: dto });

    await this.audit.log({
      tenantId, usuarioId, accion: 'UPDATE', entidad: 'propiedad', entidadId: id, detalle: dto,
    });

    return propiedad;
  }

  async remove(tenantId: string, id: string, usuarioId?: string) {
    await this.findOne(tenantId, id);

    const [contratosActivos, pagos, gastos] = await Promise.all([
      this.prisma.contratoAlquiler.count({ where: { propiedadId: id, estado: { in: ['ACTIVO', 'ATRASADO'] } } }),
      this.prisma.pagoAlquiler.count({ where: { contrato: { propiedadId: id } } }),
      this.prisma.gastoPropiedad.count({ where: { propiedadId: id } }),
    ]);

    if (contratosActivos > 0) throw new BadRequestException('No se puede eliminar: tiene contratos activos.');
    if (pagos > 0) throw new BadRequestException('No se puede eliminar: tiene historial de pagos.');
    if (gastos > 0) throw new BadRequestException('No se puede eliminar: tiene gastos registrados.');

    await this.prisma.propiedad.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.audit.log({ tenantId, usuarioId, accion: 'SOFT_DELETE', entidad: 'propiedad', entidadId: id });

    return { message: 'Propiedad eliminada correctamente.' };
  }
}

@Injectable()
export class ImagenesService {
  constructor(private prisma: PrismaService) {}

  async add(tenantId: string, dto: { propiedadId: string; url: string; nombre?: string; orden?: number }) {
    const count = await this.prisma.propiedadImagen.count({ where: { propiedadId: dto.propiedadId, tenantId } });
    if (count >= 10) throw new BadRequestException('Máximo 10 imágenes por propiedad.');
    return this.prisma.propiedadImagen.create({
      data: { tenantId, propiedadId: dto.propiedadId, url: dto.url, nombre: dto.nombre, orden: dto.orden ?? count },
    });
  }

  async remove(tenantId: string, id: string) {
    const img = await this.prisma.propiedadImagen.findFirst({ where: { id, tenantId } });
    if (!img) throw new NotFoundException('Imagen no encontrada.');
    return this.prisma.propiedadImagen.delete({ where: { id } });
  }
}

@Controller('properties')
@UseGuards(JwtAuthGuard)
export class PropertiesController {
  constructor(private svc: PropertiesService, private imgSvc: ImagenesService) {}

  @Get() findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Get(':id') findOne(@TenantId() tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }

  @Post()
  @UseGuards(RolesGuard, PlanGuard) @Roles('ADMIN', 'AGENTE')
  create(@TenantId() tid: string, @Body() dto: CreatePropertyDto, @CurrentUser('sub') uid: string) {
    return this.svc.create(tid, dto, uid);
  }

  @Put(':id')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdatePropertyDto, @CurrentUser('sub') uid: string) {
    return this.svc.update(tid, id, dto, uid);
  }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) {
    return this.svc.remove(tid, id, uid);
  }

  @Post('imagenes')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  addImagen(@TenantId() tid: string, @Body() dto: any) { return this.imgSvc.add(tid, dto); }

  @Delete('imagenes/:id')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  removeImagen(@TenantId() tid: string, @Param('id') id: string) { return this.imgSvc.remove(tid, id); }
}

@Module({ imports: [AuditModule, PlansModule], providers: [PropertiesService, ImagenesService], controllers: [PropertiesController], exports: [PropertiesService] })
export class PropertiesModule {}
