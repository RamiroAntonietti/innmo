import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId } from '../common/decorators/user.decorator';

// ── DTOs ──
enum TipoOperacion { VENTA='VENTA', ALQUILER='ALQUILER' }
enum EstadoPropiedad { DISPONIBLE='DISPONIBLE', RESERVADO='RESERVADO', VENDIDO='VENDIDO', ALQUILADO='ALQUILADO' }

export class CreatePropertyDto {
  @IsString() titulo: string;
  @IsString() @IsOptional() descripcion?: string;
  @IsString() direccion: string;
  @IsString() ciudad: string;
  @IsNumber() @Min(0) precio: number;
  @IsEnum(TipoOperacion) tipoOperacion: TipoOperacion;
  @IsEnum(EstadoPropiedad) @IsOptional() estado?: EstadoPropiedad;
  @IsNumber() @IsOptional() dormitorios?: number;
  @IsNumber() @IsOptional() banos?: number;
  @IsNumber() @IsOptional() metrosCuadrados?: number;
  @IsString() @IsOptional() propietarioId?: string;
}

export class UpdatePropertyDto {
  @IsString() @IsOptional() titulo?: string;
  @IsString() @IsOptional() descripcion?: string;
  @IsString() @IsOptional() direccion?: string;
  @IsString() @IsOptional() ciudad?: string;
  @IsNumber() @IsOptional() precio?: number;
  @IsEnum(TipoOperacion) @IsOptional() tipoOperacion?: TipoOperacion;
  @IsEnum(EstadoPropiedad) @IsOptional() estado?: EstadoPropiedad;
  @IsNumber() @IsOptional() dormitorios?: number;
  @IsNumber() @IsOptional() banos?: number;
  @IsNumber() @IsOptional() metrosCuadrados?: number;
  @IsString() @IsOptional() propietarioId?: string;
}

// ── Service ──
@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { search, tipoOperacion, estado, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (search) where.OR = [
      { titulo: { contains: search, mode: 'insensitive' } },
      { direccion: { contains: search, mode: 'insensitive' } },
      { ciudad: { contains: search, mode: 'insensitive' } },
    ];
    if (tipoOperacion) where.tipoOperacion = tipoOperacion;
    if (estado) where.estado = estado;

    const [data, total] = await Promise.all([
      this.prisma.propiedad.findMany({ where, skip: (page-1)*limit, take: Number(limit), orderBy: { createdAt: 'desc' } }),
      this.prisma.propiedad.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.prisma.propiedad.findFirst({
      where: { id, tenantId },
      include: { propietario: true, imagenes: { orderBy: { orden: "asc" } } },
    });
    if (!p) throw new NotFoundException("Propiedad no encontrada");
    return p;
  }

  async create(tenantId: string, dto: CreatePropertyDto) {
    return this.prisma.propiedad.create({ data: { ...dto, tenantId } });
  }

  async update(tenantId: string, id: string, dto: UpdatePropertyDto) {
    await this.findOne(tenantId, id);
    return this.prisma.propiedad.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.propiedad.delete({ where: { id } });
  }
}

// ── Controller ──
@Controller('properties')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PropertiesController {
  constructor(private svc: PropertiesService) {}

  @Get() findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Get(':id') findOne(@TenantId() tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }

  @Post() @Roles('ADMIN','AGENTE')
  create(@TenantId() tid: string, @Body() dto: CreatePropertyDto) { return this.svc.create(tid, dto); }

  @Put(':id') @Roles('ADMIN','AGENTE')
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdatePropertyDto) { return this.svc.update(tid, id, dto); }

  @Delete(':id') @Roles('ADMIN')
  remove(@TenantId() tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }
}

// ── Module ──
@Module({ providers: [PropertiesService], controllers: [PropertiesController] })
export class PropertiesModule {}

// ── Imagenes Service/Controller (append to module file) ──
import { Injectable as InjectableImg, NotFoundException as NotFoundImg } from '@nestjs/common';
import { Controller as ControllerImg, Post as PostImg, Delete as DeleteImg, Body as BodyImg, Param as ParamImg, UseGuards as UseGuardsImg } from '@nestjs/common';
import { Module as ModuleImg } from '@nestjs/common';
import { IsString as IsStringImg, IsNumber as IsNumberImg, IsOptional as IsOptionalImg, Min as MinImg } from 'class-validator';

export class AddImagenDto {
  @IsStringImg() propiedadId: string;
  @IsStringImg() url: string;
  @IsStringImg() @IsOptionalImg() nombre?: string;
  @IsNumberImg() @IsOptionalImg() orden?: number;
}

@InjectableImg()
export class ImagenesService {
  constructor(private prisma: PrismaService) {}

  async add(tenantId: string, dto: AddImagenDto) {
    const count = await this.prisma.propiedadImagen.count({ where: { propiedadId: dto.propiedadId, tenantId } });
    if (count >= 10) throw new Error('Máximo 10 imágenes por propiedad');
    return this.prisma.propiedadImagen.create({
      data: { tenantId, propiedadId: dto.propiedadId, url: dto.url, nombre: dto.nombre, orden: dto.orden ?? count },
    });
  }

  async remove(tenantId: string, id: string) {
    const img = await this.prisma.propiedadImagen.findFirst({ where: { id, tenantId } });
    if (!img) throw new NotFoundImg('Imagen no encontrada');
    return this.prisma.propiedadImagen.delete({ where: { id } });
  }
}

@ControllerImg('properties/imagenes')
@UseGuardsImg(JwtAuthGuard)
export class ImagenesController {
  constructor(private svc: ImagenesService) {}

  @PostImg()
  add(@TenantId() tid: string, @BodyImg() dto: AddImagenDto) { return this.svc.add(tid, dto); }

  @DeleteImg(':id')
  remove(@TenantId() tid: string, @ParamImg('id') id: string) { return this.svc.remove(tid, id); }
}

@ModuleImg({ providers: [ImagenesService], controllers: [ImagenesController] })
export class ImagenesModule {}