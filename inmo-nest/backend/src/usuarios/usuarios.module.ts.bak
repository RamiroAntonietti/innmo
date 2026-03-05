import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { IsString, IsEmail, IsEnum, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';

enum Rol { ADMIN='ADMIN', AGENTE='AGENTE', ASISTENTE='ASISTENTE' }

export class CreateUsuarioDto {
  @IsString() @MinLength(2) nombre: string;
  @IsString() @MinLength(2) apellido: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsEnum(Rol) @IsOptional() rol?: Rol;
}

export class UpdateUsuarioDto {
  @IsString() @IsOptional() nombre?: string;
  @IsString() @IsOptional() apellido?: string;
  @IsEnum(Rol) @IsOptional() rol?: Rol;
  @IsBoolean() @IsOptional() activo?: boolean;
  @IsString() @MinLength(6) @IsOptional() password?: string;
}

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.usuario.findMany({
      where: { tenantId },
      select: { id: true, nombre: true, apellido: true, email: true, rol: true, activo: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateUsuarioDto) {
    const exists = await this.prisma.usuario.findFirst({ where: { email: dto.email, tenantId } });
    if (exists) throw new ConflictException('Ya existe un usuario con ese email.');
    const hash = await bcrypt.hash(dto.password, 12);
    return this.prisma.usuario.create({
      data: { tenantId, nombre: dto.nombre, apellido: dto.apellido, email: dto.email, password: hash, rol: dto.rol || 'AGENTE' },
      select: { id: true, nombre: true, apellido: true, email: true, rol: true, activo: true, createdAt: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateUsuarioDto) {
    const u = await this.prisma.usuario.findFirst({ where: { id, tenantId } });
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    const data: any = { ...dto };
    if (dto.password) data.password = await bcrypt.hash(dto.password, 12);
    else delete data.password;
    return this.prisma.usuario.update({
      where: { id }, data,
      select: { id: true, nombre: true, apellido: true, email: true, rol: true, activo: true },
    });
  }

  async remove(tenantId: string, id: string, adminId: string) {
    if (id === adminId) throw new BadRequestException('No podés eliminarte a vos mismo.');
    const u = await this.prisma.usuario.findFirst({ where: { id, tenantId } });
    if (!u) throw new NotFoundException('Usuario no encontrado.');
    if (u.rol === 'ADMIN') {
      const admins = await this.prisma.usuario.count({ where: { tenantId, rol: 'ADMIN', activo: true } });
      if (admins <= 1) throw new BadRequestException('Debe quedar al menos un administrador activo.');
    }
    return this.prisma.usuario.delete({ where: { id } });
  }
}

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsuariosController {
  constructor(private svc: UsuariosService) {}

  @Get() list(@TenantId() tid: string) { return this.svc.findAll(tid); }
  @Post() create(@TenantId() tid: string, @Body() dto: CreateUsuarioDto) { return this.svc.create(tid, dto); }
  @Put(':id') update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateUsuarioDto) { return this.svc.update(tid, id, dto); }
  @Delete(':id') remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') me: string) { return this.svc.remove(tid, id, me); }
}

@Module({ providers: [UsuariosService], controllers: [UsuariosController] })
export class UsuariosModule {}
