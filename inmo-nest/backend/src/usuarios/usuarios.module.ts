import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PlanService } from '../plans/plan.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';
import { AuditModule } from '../audit/audit.module';
import { PlansModule } from '../plans/plans.module';

export class CreateUsuarioDto {
  @IsString() nombre: string;
  @IsString() apellido: string;
  @IsEmail({}, { message: 'Email inválido.' }) email: string;
  @IsString() @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' }) password: string;
  @IsEnum(['ADMIN', 'AGENTE']) @IsOptional() rol?: string;
}

export class UpdateUsuarioDto {
  @IsString() @IsOptional() nombre?: string;
  @IsString() @IsOptional() apellido?: string;
  @IsString() @IsOptional() @MinLength(8) password?: string;
  @IsEnum(['ADMIN', 'AGENTE']) @IsOptional() rol?: string;
  @IsOptional() activo?: boolean;
}

@Injectable()
export class UsuariosService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private planService: PlanService,
  ) {}

  async findAll(tenantId: string) {
    return this.prisma.usuario.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, nombre: true, apellido: true, email: true, rol: true, activo: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateUsuarioDto, adminId: string) {
    // ── Verificar límite del plan ─────────────────────────────
    await this.planService.checkUserLimit(tenantId);

    this.validatePassword(dto.password);

    const exists = await this.prisma.usuario.findFirst({
      where: { email: dto.email, tenantId, deletedAt: null },
    });
    if (exists) throw new ConflictException('Ya existe un usuario con ese email.');

    const hash = await bcrypt.hash(dto.password, 12);
    const usuario = await this.prisma.usuario.create({
      data: { tenantId, nombre: dto.nombre, apellido: dto.apellido, email: dto.email, password: hash, rol: (dto.rol || 'AGENTE') as any },
      select: { id: true, nombre: true, apellido: true, email: true, rol: true, activo: true, createdAt: true },
    });

    await this.audit.log({
      tenantId, usuarioId: adminId, accion: 'CREATE', entidad: 'usuario',
      entidadId: usuario.id, detalle: { email: dto.email, rol: dto.rol },
    });

    return usuario;
  }

  async update(tenantId: string, id: string, dto: UpdateUsuarioDto, adminId: string) {
    const u = await this.prisma.usuario.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!u) throw new NotFoundException('Usuario no encontrado.');

    const data: any = { ...dto };
    if (dto.password) {
      this.validatePassword(dto.password);
      data.password = await bcrypt.hash(dto.password, 12);
    } else { delete data.password; }

    const updated = await this.prisma.usuario.update({
      where: { id }, data,
      select: { id: true, nombre: true, apellido: true, email: true, rol: true, activo: true },
    });

    await this.audit.log({
      tenantId, usuarioId: adminId, accion: 'UPDATE', entidad: 'usuario',
      entidadId: id, detalle: { cambios: { ...dto, password: dto.password ? '***' : undefined } },
    });

    return updated;
  }

  async remove(tenantId: string, id: string, adminId: string) {
    if (id === adminId) throw new BadRequestException('No podés eliminarte a vos mismo.');

    const u = await this.prisma.usuario.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!u) throw new NotFoundException('Usuario no encontrado.');

    if (u.rol === 'ADMIN') {
      const admins = await this.prisma.usuario.count({
        where: { tenantId, rol: 'ADMIN', activo: true, deletedAt: null },
      });
      if (admins <= 1) throw new BadRequestException('Debe quedar al menos un administrador activo.');
    }

    await this.prisma.usuario.update({ where: { id }, data: { deletedAt: new Date(), activo: false } });

    await this.audit.log({ tenantId, usuarioId: adminId, accion: 'SOFT_DELETE', entidad: 'usuario', entidadId: id });

    return { message: 'Usuario eliminado correctamente.' };
  }

  private validatePassword(password: string) {
    if (password.length < 8) throw new BadRequestException('La contraseña debe tener al menos 8 caracteres.');
    if (!/[a-zA-Z]/.test(password)) throw new BadRequestException('La contraseña debe contener al menos una letra.');
    if (!/[0-9]/.test(password)) throw new BadRequestException('La contraseña debe contener al menos un número.');
  }
}

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsuariosController {
  constructor(private svc: UsuariosService) {}

  @Get() list(@TenantId() tid: string) { return this.svc.findAll(tid); }

  @Post()
  create(@TenantId() tid: string, @Body() dto: CreateUsuarioDto, @CurrentUser('sub') me: string) {
    return this.svc.create(tid, dto, me);
  }

  @Put(':id')
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateUsuarioDto, @CurrentUser('sub') me: string) {
    return this.svc.update(tid, id, dto, me);
  }

  @Delete(':id')
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') me: string) {
    return this.svc.remove(tid, id, me);
  }
}

@Module({ imports: [AuditModule, PlansModule], providers: [UsuariosService], controllers: [UsuariosController] })
export class UsuariosModule {}
