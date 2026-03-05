import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min } from 'class-validator';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId } from '../common/decorators/user.decorator';

// ── Enums ──
export enum TipoGasto {
  REPARACION = 'REPARACION',
  IMPUESTO = 'IMPUESTO',
  EXPENSA = 'EXPENSA',
  SEGURO = 'SEGURO',
  SERVICIO = 'SERVICIO',
  HONORARIO = 'HONORARIO',
  OTRO = 'OTRO',
}

export enum PagadoPor {
  PROPIETARIO = 'PROPIETARIO',
  INMOBILIARIA = 'INMOBILIARIA',
}

// ── DTOs ──
export class CreateGastoDto {
  @IsString() propiedadId: string;
  @IsEnum(TipoGasto) tipo: TipoGasto;
  @IsString() descripcion: string;
  @IsNumber() @Min(0) monto: number;
  @IsDateString() fecha: string;
  @IsEnum(PagadoPor) @IsOptional() pagadoPor?: PagadoPor;
  @IsString() @IsOptional() comprobante?: string;
}

export class UpdateGastoDto {
  @IsEnum(TipoGasto) @IsOptional() tipo?: TipoGasto;
  @IsString() @IsOptional() descripcion?: string;
  @IsNumber() @Min(0) @IsOptional() monto?: number;
  @IsDateString() @IsOptional() fecha?: string;
  @IsEnum(PagadoPor) @IsOptional() pagadoPor?: PagadoPor;
  @IsString() @IsOptional() comprobante?: string;
}

// ── Service ──
@Injectable()
export class GastosService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { propiedadId, tipo, pagadoPor, desde, hasta } = query;
    const where: any = { tenantId };
    if (propiedadId) where.propiedadId = propiedadId;
    if (tipo) where.tipo = tipo;
    if (pagadoPor) where.pagadoPor = pagadoPor;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = new Date(desde);
      if (hasta) where.fecha.lte = new Date(hasta);
    }

    const gastos = await this.prisma.gastoPropiedad.findMany({
      where,
      include: { propiedad: { select: { titulo: true, direccion: true } } },
      orderBy: { fecha: 'desc' },
    });

    const total = gastos.reduce((sum, g) => sum + Number(g.monto), 0);
    return { data: gastos, total };
  }

  async findByPropiedad(tenantId: string, propiedadId: string) {
    const propiedad = await this.prisma.propiedad.findFirst({ where: { id: propiedadId, tenantId } });
    if (!propiedad) throw new NotFoundException('Propiedad no encontrada.');

    // Gastos
    const gastos = await this.prisma.gastoPropiedad.findMany({
      where: { propiedadId, tenantId },
      orderBy: { fecha: 'desc' },
    });

    // Ingresos (pagos cobrados de contratos activos de esta propiedad)
    const pagos = await this.prisma.pagoAlquiler.findMany({
      where: {
        estado: 'PAGADO',
        contrato: { propiedadId, tenantId },
      },
    });

    const totalGastos = gastos.reduce((sum, g) => sum + Number(g.monto), 0);
    const totalIngresos = pagos.reduce((sum, p) => sum + Number(p.montoPagado || p.monto), 0);
    const rentabilidad = totalIngresos - totalGastos;
    const rentabilidadPct = totalIngresos > 0
      ? parseFloat(((rentabilidad / totalIngresos) * 100).toFixed(2))
      : 0;

    // Gastos por tipo
    const porTipo = gastos.reduce((acc: any, g) => {
      acc[g.tipo] = (acc[g.tipo] || 0) + Number(g.monto);
      return acc;
    }, {});

    return {
      propiedad,
      gastos,
      resumen: {
        totalGastos,
        totalIngresos,
        rentabilidad,
        rentabilidadPct,
        porTipo,
      },
    };
  }

  async create(tenantId: string, dto: CreateGastoDto) {
    const propiedad = await this.prisma.propiedad.findFirst({ where: { id: dto.propiedadId, tenantId } });
    if (!propiedad) throw new NotFoundException('Propiedad no encontrada.');

    return this.prisma.gastoPropiedad.create({
      data: {
        tenantId,
        propiedadId: dto.propiedadId,
        tipo: dto.tipo,
        descripcion: dto.descripcion,
        monto: dto.monto,
        fecha: new Date(dto.fecha),
        pagadoPor: dto.pagadoPor || 'PROPIETARIO',
        comprobante: dto.comprobante,
      },
      include: { propiedad: { select: { titulo: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateGastoDto) {
    const gasto = await this.prisma.gastoPropiedad.findFirst({ where: { id, tenantId } });
    if (!gasto) throw new NotFoundException('Gasto no encontrado.');

    return this.prisma.gastoPropiedad.update({
      where: { id },
      data: {
        ...dto,
        fecha: dto.fecha ? new Date(dto.fecha) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const gasto = await this.prisma.gastoPropiedad.findFirst({ where: { id, tenantId } });
    if (!gasto) throw new NotFoundException('Gasto no encontrado.');
    return this.prisma.gastoPropiedad.delete({ where: { id } });
  }

  async resumenGeneral(tenantId: string) {
    // Gastos totales por propiedad con ingresos
    const propiedades = await this.prisma.propiedad.findMany({
      where: { tenantId },
      select: {
        id: true, titulo: true, direccion: true,
        gastos: { select: { monto: true, tipo: true } },
        contratos: {
          select: {
            pagos: {
              where: { estado: 'PAGADO' },
              select: { monto: true, montoPagado: true },
            },
          },
        },
      },
    });

    return propiedades.map(p => {
      const totalGastos = p.gastos.reduce((s, g) => s + Number(g.monto), 0);
      const totalIngresos = p.contratos.flatMap(c => c.pagos)
        .reduce((s, pago) => s + Number(pago.montoPagado || pago.monto), 0);
      const rentabilidad = totalIngresos - totalGastos;
      return {
        id: p.id,
        titulo: p.titulo,
        direccion: p.direccion,
        totalGastos,
        totalIngresos,
        rentabilidad,
        rentabilidadPct: totalIngresos > 0
          ? parseFloat(((rentabilidad / totalIngresos) * 100).toFixed(2))
          : 0,
      };
    });
  }
}

// ── Controller ──
@Controller('gastos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GastosController {
  constructor(private svc: GastosService) {}

  @Get()
  findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }

  @Get('resumen')
  resumen(@TenantId() tid: string) { return this.svc.resumenGeneral(tid); }

  @Get('propiedad/:id')
  byPropiedad(@TenantId() tid: string, @Param('id') id: string) { return this.svc.findByPropiedad(tid, id); }

  @Post() @Roles('ADMIN', 'AGENTE')
  create(@TenantId() tid: string, @Body() dto: CreateGastoDto) { return this.svc.create(tid, dto); }

  @Put(':id') @Roles('ADMIN', 'AGENTE')
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateGastoDto) { return this.svc.update(tid, id, dto); }

  @Delete(':id') @Roles('ADMIN')
  remove(@TenantId() tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }
}

// ── Module ──
@Module({ providers: [GastosService], controllers: [GastosController] })
export class GastosModule {}
