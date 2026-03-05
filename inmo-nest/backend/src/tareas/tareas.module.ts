import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards/auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';

// ── DTOs ──
export class CreateTareaDto {
  @IsString() titulo: string;
  @IsString() @IsOptional() descripcion?: string;
  @IsEnum(['SEGUIMIENTO_CLIENTE','VISITA_PROPIEDAD','LLAMADA','VENCIMIENTO_CONTRATO','PAGO_PENDIENTE','GENERAL']) tipo: string;
  @IsEnum(['ALTA','MEDIA','BAJA']) @IsOptional() prioridad?: string;
  @IsDateString() @IsOptional() fechaVence?: string;
  @IsString() @IsOptional() clienteId?: string;
  @IsString() @IsOptional() propiedadId?: string;
}

export class UpdateTareaDto {
  @IsString() @IsOptional() titulo?: string;
  @IsString() @IsOptional() descripcion?: string;
  @IsEnum(['SEGUIMIENTO_CLIENTE','VISITA_PROPIEDAD','LLAMADA','VENCIMIENTO_CONTRATO','PAGO_PENDIENTE','GENERAL']) @IsOptional() tipo?: string;
  @IsEnum(['ALTA','MEDIA','BAJA']) @IsOptional() prioridad?: string;
  @IsEnum(['PENDIENTE','EN_PROGRESO','COMPLETADA','CANCELADA']) @IsOptional() estado?: string;
  @IsDateString() @IsOptional() fechaVence?: string;
  @IsString() @IsOptional() clienteId?: string;
  @IsString() @IsOptional() propiedadId?: string;
}

// ── Service ──
@Injectable()
export class TareasService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, usuarioId: string, query: any) {
    const { estado, tipo, prioridad } = query;
    const where: any = { tenantId, usuarioId };
    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;
    if (prioridad) where.prioridad = prioridad;

    const tareas = await this.prisma.tarea.findMany({
      where,
      include: {
        cliente: { select: { nombre: true, apellido: true } },
        propiedad: { select: { titulo: true, direccion: true } },
      },
      orderBy: [
        { estado: 'asc' },
        { fechaVence: 'asc' },
        { prioridad: 'asc' },
      ],
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return tareas.map(t => ({
      ...t,
      vencida: t.fechaVence && new Date(t.fechaVence) < hoy && t.estado === 'PENDIENTE',
      venceHoy: t.fechaVence && new Date(t.fechaVence).toDateString() === hoy.toDateString(),
    }));
  }

  async getResumen(tenantId: string, usuarioId: string) {
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const [pendientes, enProgreso, vencenHoy, vencidas] = await Promise.all([
      this.prisma.tarea.count({ where: { tenantId, usuarioId, estado: 'PENDIENTE' } }),
      this.prisma.tarea.count({ where: { tenantId, usuarioId, estado: 'EN_PROGRESO' } }),
      this.prisma.tarea.count({ where: { tenantId, usuarioId, estado: 'PENDIENTE', fechaVence: { gte: inicioHoy, lte: hoy } } }),
      this.prisma.tarea.count({ where: { tenantId, usuarioId, estado: 'PENDIENTE', fechaVence: { lt: inicioHoy } } }),
    ]);

    return { pendientes, enProgreso, vencenHoy, vencidas };
  }

  async create(tenantId: string, usuarioId: string, dto: CreateTareaDto) {
    return this.prisma.tarea.create({
      data: {
        tenantId,
        usuarioId,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        tipo: dto.tipo as any,
        prioridad: (dto.prioridad || 'MEDIA') as any,
        fechaVence: dto.fechaVence ? new Date(dto.fechaVence) : null,
        clienteId: dto.clienteId || null,
        propiedadId: dto.propiedadId || null,
      },
      include: {
        cliente: { select: { nombre: true, apellido: true } },
        propiedad: { select: { titulo: true } },
      },
    });
  }

  async update(tenantId: string, id: string, usuarioId: string, dto: UpdateTareaDto) {
    const tarea = await this.prisma.tarea.findFirst({ where: { id, tenantId, usuarioId } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada.');
    const data: any = {};
    if (dto.titulo !== undefined) data.titulo = dto.titulo;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.tipo !== undefined) data.tipo = dto.tipo;
    if (dto.prioridad !== undefined) data.prioridad = dto.prioridad;
    if (dto.estado !== undefined) data.estado = dto.estado;
    if (dto.fechaVence !== undefined) data.fechaVence = new Date(dto.fechaVence);
    if (dto.clienteId !== undefined) data.clienteId = dto.clienteId || null;
    if (dto.propiedadId !== undefined) data.propiedadId = dto.propiedadId || null;
    return this.prisma.tarea.update({ where: { id }, data });
  }

  async completar(tenantId: string, id: string, usuarioId: string) {
    const tarea = await this.prisma.tarea.findFirst({ where: { id, tenantId, usuarioId } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada.');
    return this.prisma.tarea.update({ where: { id }, data: { estado: 'COMPLETADA' } });
  }

  async remove(tenantId: string, id: string, usuarioId: string) {
    const tarea = await this.prisma.tarea.findFirst({ where: { id, tenantId, usuarioId } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada.');
    return this.prisma.tarea.delete({ where: { id } });
  }
}

// ── Controller ──
@Controller('tareas')
@UseGuards(JwtAuthGuard)
export class TareasController {
  constructor(private svc: TareasService) {}

  @Get()
  findAll(@TenantId() tid: string, @CurrentUser('sub') uid: string, @Query() q: any) {
    return this.svc.findAll(tid, uid, q);
  }

  @Get('resumen')
  resumen(@TenantId() tid: string, @CurrentUser('sub') uid: string) {
    return this.svc.getResumen(tid, uid);
  }

  @Post()
  create(@TenantId() tid: string, @CurrentUser('sub') uid: string, @Body() dto: CreateTareaDto) {
    return this.svc.create(tid, uid, dto);
  }

  @Put(':id')
  update(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string, @Body() dto: UpdateTareaDto) {
    return this.svc.update(tid, id, uid, dto);
  }

  @Post(':id/completar')
  completar(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) {
    return this.svc.completar(tid, id, uid);
  }

  @Delete(':id')
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) {
    return this.svc.remove(tid, id, uid);
  }
}

// ── Module ──
@Module({ providers: [TareasService], controllers: [TareasController] })
export class TareasModule {}