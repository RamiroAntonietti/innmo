import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min } from 'class-validator';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { RequirePlanModule, PlanGuard } from '../common/guards/plan.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';
import { AuditModule } from '../audit/audit.module';
import { PlansModule } from '../plans/plans.module';

enum TipoGasto { REPARACION='REPARACION', IMPUESTO='IMPUESTO', EXPENSA='EXPENSA', SEGURO='SEGURO', SERVICIO='SERVICIO', HONORARIO='HONORARIO', OTRO='OTRO' }
enum PagadoPor { PROPIETARIO='PROPIETARIO', INMOBILIARIA='INMOBILIARIA' }

export class CreateGastoDto {
  @IsString() propiedadId: string;
  @IsEnum(TipoGasto) tipo: TipoGasto;
  @IsString() descripcion: string;
  @IsNumber() @Min(0.01) monto: number;
  @IsDateString() fecha: string;
  @IsEnum(PagadoPor) @IsOptional() pagadoPor?: PagadoPor;
  @IsString() @IsOptional() comprobante?: string;
}

export class UpdateGastoDto {
  @IsEnum(TipoGasto) @IsOptional() tipo?: TipoGasto;
  @IsString() @IsOptional() descripcion?: string;
  @IsNumber() @IsOptional() @Min(0.01) monto?: number;
  @IsDateString() @IsOptional() fecha?: string;
  @IsEnum(PagadoPor) @IsOptional() pagadoPor?: PagadoPor;
  @IsString() @IsOptional() comprobante?: string;
}

@Injectable()
export class GastosService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll(tenantId: string, query: any) {
    const { propiedadId, tipo, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (propiedadId) where.propiedadId = propiedadId;
    if (tipo) where.tipo = tipo;

    const [data, total] = await Promise.all([
      this.prisma.gastoPropiedad.findMany({
        where, skip: (Number(page)-1)*Number(limit), take: Number(limit),
        include: { propiedad: { select: { titulo: true, direccion: true } } },
        orderBy: { fecha: 'desc' },
      }),
      this.prisma.gastoPropiedad.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async create(tenantId: string, dto: CreateGastoDto, usuarioId?: string) {
    const propiedad = await this.prisma.propiedad.findFirst({ where: { id: dto.propiedadId, tenantId, deletedAt: null } });
    if (!propiedad) throw new NotFoundException('Propiedad no encontrada.');

    const gasto = await this.prisma.gastoPropiedad.create({
      data: { tenantId, propiedadId: dto.propiedadId, tipo: dto.tipo, descripcion: dto.descripcion, monto: dto.monto, fecha: new Date(dto.fecha), pagadoPor: dto.pagadoPor || 'PROPIETARIO', comprobante: dto.comprobante },
    });

    await this.audit.log({ tenantId, usuarioId, accion: 'CREATE', entidad: 'gasto', entidadId: gasto.id, detalle: { tipo: dto.tipo, monto: dto.monto } });
    return gasto;
  }

  async update(tenantId: string, id: string, dto: UpdateGastoDto, usuarioId?: string) {
    const gasto = await this.prisma.gastoPropiedad.findFirst({ where: { id, tenantId } });
    if (!gasto) throw new NotFoundException('Gasto no encontrado.');
    const updated = await this.prisma.gastoPropiedad.update({ where: { id }, data: { ...dto, fecha: dto.fecha ? new Date(dto.fecha) : undefined } });
    await this.audit.log({ tenantId, usuarioId, accion: 'UPDATE', entidad: 'gasto', entidadId: id, detalle: dto });
    return updated;
  }

  async remove(tenantId: string, id: string, usuarioId?: string) {
    const gasto = await this.prisma.gastoPropiedad.findFirst({ where: { id, tenantId } });
    if (!gasto) throw new NotFoundException('Gasto no encontrado.');
    await this.prisma.gastoPropiedad.delete({ where: { id } });
    await this.audit.log({ tenantId, usuarioId, accion: 'DELETE', entidad: 'gasto', entidadId: id });
    return { message: 'Gasto eliminado.' };
  }
}

// ── El controlador requiere módulo 'gastos' del plan ─────────────
@Controller('gastos')
@UseGuards(JwtAuthGuard, PlanGuard)
@RequirePlanModule('gastos')
export class GastosController {
  constructor(private svc: GastosService) {}

  @Get() findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }

  @Post()
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  create(@TenantId() tid: string, @Body() dto: CreateGastoDto, @CurrentUser('sub') uid: string) { return this.svc.create(tid, dto, uid); }

  @Put(':id')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateGastoDto, @CurrentUser('sub') uid: string) { return this.svc.update(tid, id, dto, uid); }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) { return this.svc.remove(tid, id, uid); }
}

@Module({ imports: [AuditModule, PlansModule], providers: [GastosService], controllers: [GastosController] })
export class GastosModule {}
