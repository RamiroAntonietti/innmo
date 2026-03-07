import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsEnum, IsOptional, IsDateString, MinLength } from 'class-validator';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';

enum TipoTarea { SEGUIMIENTO_CLIENTE='SEGUIMIENTO_CLIENTE', VISITA_PROPIEDAD='VISITA_PROPIEDAD', LLAMADA='LLAMADA', VENCIMIENTO_CONTRATO='VENCIMIENTO_CONTRATO', PAGO_PENDIENTE='PAGO_PENDIENTE', GENERAL='GENERAL' }
enum Prioridad { ALTA='ALTA', MEDIA='MEDIA', BAJA='BAJA' }
enum EstadoTarea { PENDIENTE='PENDIENTE', EN_PROGRESO='EN_PROGRESO', COMPLETADA='COMPLETADA', CANCELADA='CANCELADA' }

export class CreateTareaDto {
  @IsString() @MinLength(3, { message: 'El título debe tener al menos 3 caracteres.' }) titulo: string;
  @IsString() @IsOptional() descripcion?: string;
  @IsEnum(TipoTarea) tipo: TipoTarea;
  @IsEnum(Prioridad) @IsOptional() prioridad?: Prioridad;
  @IsDateString() @IsOptional() fechaVence?: string;
  @IsString() @IsOptional() clienteId?: string;
  @IsString() @IsOptional() propiedadId?: string;
}

export class UpdateTareaDto {
  @IsString() @IsOptional() @MinLength(3) titulo?: string;
  @IsString() @IsOptional() descripcion?: string;
  @IsEnum(TipoTarea) @IsOptional() tipo?: TipoTarea;
  @IsEnum(Prioridad) @IsOptional() prioridad?: Prioridad;
  @IsEnum(EstadoTarea) @IsOptional() estado?: EstadoTarea;
  @IsDateString() @IsOptional() fechaVence?: string;
  @IsString() @IsOptional() clienteId?: string;
  @IsString() @IsOptional() propiedadId?: string;
}

@Injectable()
export class TareasService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll(tenantId: string, query: any) {
    const { estado, tipo, prioridad, usuarioId, page = 1, limit = 30 } = query;
    const where: any = { tenantId };
    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;
    if (prioridad) where.prioridad = prioridad;
    if (usuarioId) where.usuarioId = usuarioId;

    // Auto-marcar vencidas
    await this.marcarVencidas(tenantId);

    const [data, total] = await Promise.all([
      this.prisma.tarea.findMany({
        where, skip: (Number(page)-1)*Number(limit), take: Number(limit),
        include: {
          usuario: { select: { nombre: true, apellido: true } },
          cliente: { select: { nombre: true, apellido: true } },
          propiedad: { select: { titulo: true } },
        },
        orderBy: [{ prioridad: 'asc' }, { fechaVence: 'asc' }],
      }),
      this.prisma.tarea.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async create(tenantId: string, dto: CreateTareaDto, usuarioId: string) {
    // Validar relaciones si se proveen
    if (dto.clienteId) {
      const cliente = await this.prisma.cliente.findFirst({ where: { id: dto.clienteId, tenantId, deletedAt: null } });
      if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    }
    if (dto.propiedadId) {
      const prop = await this.prisma.propiedad.findFirst({ where: { id: dto.propiedadId, tenantId, deletedAt: null } });
      if (!prop) throw new NotFoundException('Propiedad no encontrada.');
    }

    const tarea = await this.prisma.tarea.create({
      data: {
        tenantId, usuarioId, titulo: dto.titulo, descripcion: dto.descripcion,
        tipo: dto.tipo, prioridad: dto.prioridad || 'MEDIA',
        fechaVence: dto.fechaVence ? new Date(dto.fechaVence) : undefined,
        clienteId: dto.clienteId, propiedadId: dto.propiedadId,
      },
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'CREATE', entidad: 'tarea',
      entidadId: tarea.id, detalle: { titulo: dto.titulo, tipo: dto.tipo },
    });

    return tarea;
  }

  async update(tenantId: string, id: string, dto: UpdateTareaDto, usuarioId: string) {
    const tarea = await this.prisma.tarea.findFirst({ where: { id, tenantId } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada.');

    if (tarea.estado === 'COMPLETADA' && dto.estado !== 'CANCELADA') {
      // Permitir reabrir solo si es admin implícitamente via payload
    }

    const updated = await this.prisma.tarea.update({
      where: { id },
      data: { ...dto, fechaVence: dto.fechaVence ? new Date(dto.fechaVence) : undefined } as any,
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'UPDATE', entidad: 'tarea', entidadId: id, detalle: dto,
    });

    return updated;
  }

  async remove(tenantId: string, id: string, usuarioId: string) {
    const tarea = await this.prisma.tarea.findFirst({ where: { id, tenantId } });
    if (!tarea) throw new NotFoundException('Tarea no encontrada.');

    await this.prisma.tarea.delete({ where: { id } });

    await this.audit.log({
      tenantId, usuarioId, accion: 'DELETE', entidad: 'tarea', entidadId: id,
    });

    return { message: 'Tarea eliminada.' };
  }

  private async marcarVencidas(tenantId: string) {
    await this.prisma.tarea.updateMany({
      where: {
        tenantId,
        estado: { in: ['PENDIENTE', 'EN_PROGRESO'] },
        fechaVence: { lt: new Date() },
      },
      data: { estado: 'CANCELADA' as any },
    });
  }
}

@Controller('tareas')
@UseGuards(JwtAuthGuard)
export class TareasController {
  constructor(private svc: TareasService) {}

  @Get() findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }

  @Post()
  create(@TenantId() tid: string, @Body() dto: CreateTareaDto, @CurrentUser('sub') uid: string) {
    return this.svc.create(tid, dto, uid);
  }

  @Put(':id')
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateTareaDto, @CurrentUser('sub') uid: string) {
    return this.svc.update(tid, id, dto, uid);
  }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) {
    return this.svc.remove(tid, id, uid);
  }
}

@Module({ imports: [AuditModule], providers: [TareasService], controllers: [TareasController] })
export class TareasModule {}
