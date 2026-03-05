import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min } from 'class-validator';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId } from '../common/decorators/user.decorator';

export class CreateFacturaDto {
  @IsString() propiedadId: string;
  @IsEnum(['LUZ','GAS','AGUA','INTERNET','EXPENSAS','TELEFONO','OTRO']) tipoServicio: string;
  @IsNumber() @Min(0) monto: number;
  @IsDateString() fechaVence: string;
  @IsString() @IsOptional() notas?: string;
}

export class UpdateFacturaDto {
  @IsEnum(['LUZ','GAS','AGUA','INTERNET','EXPENSAS','TELEFONO','OTRO']) @IsOptional() tipoServicio?: string;
  @IsNumber() @Min(0) @IsOptional() monto?: number;
  @IsDateString() @IsOptional() fechaVence?: string;
  @IsEnum(['PENDIENTE','PAGADO','VENCIDO']) @IsOptional() estado?: string;
  @IsString() @IsOptional() notas?: string;
}

@Injectable()
export class FacturasService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { propiedadId, estado } = query;
    const where: any = { tenantId };
    if (propiedadId) where.propiedadId = propiedadId;
    if (estado) where.estado = estado;

    return this.prisma.facturaServicio.findMany({
      where,
      include: { propiedad: { select: { titulo: true, direccion: true } } },
      orderBy: { fechaVence: 'asc' },
    });
  }

  async getProximasAVencer(tenantId: string) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const en7dias = new Date(hoy);
    en7dias.setDate(en7dias.getDate() + 7);

    return this.prisma.facturaServicio.findMany({
      where: {
        tenantId,
        estado: 'PENDIENTE',
        fechaVence: { lte: en7dias },
      },
      include: { propiedad: { select: { titulo: true } } },
      orderBy: { fechaVence: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateFacturaDto) {
    const propiedad = await this.prisma.propiedad.findFirst({ where: { id: dto.propiedadId, tenantId } });
    if (!propiedad) throw new NotFoundException('Propiedad no encontrada.');
    return this.prisma.facturaServicio.create({
      data: {
        tenantId,
        propiedadId: dto.propiedadId,
        tipoServicio: dto.tipoServicio as any,
        monto: dto.monto,
        fechaVence: new Date(dto.fechaVence),
        notas: dto.notas,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateFacturaDto) {
    const f = await this.prisma.facturaServicio.findFirst({ where: { id, tenantId } });
    if (!f) throw new NotFoundException('Factura no encontrada.');
    const data: any = { ...dto };
    if (dto.fechaVence) data.fechaVence = new Date(dto.fechaVence);
    return this.prisma.facturaServicio.update({ where: { id }, data });
  }

  async remove(tenantId: string, id: string) {
    const f = await this.prisma.facturaServicio.findFirst({ where: { id, tenantId } });
    if (!f) throw new NotFoundException('Factura no encontrada.');
    return this.prisma.facturaServicio.delete({ where: { id } });
  }
}

@Controller('facturas')
@UseGuards(JwtAuthGuard)
export class FacturasController {
  constructor(private svc: FacturasService) {}

  @Get() findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Get('proximas') proximas(@TenantId() tid: string) { return this.svc.getProximasAVencer(tid); }
  @Post() @UseGuards(RolesGuard) @Roles('ADMIN','AGENTE') create(@TenantId() tid: string, @Body() dto: CreateFacturaDto) { return this.svc.create(tid, dto); }
  @Put(':id') @UseGuards(RolesGuard) @Roles('ADMIN','AGENTE') update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateFacturaDto) { return this.svc.update(tid, id, dto); }
  @Delete(':id') @UseGuards(RolesGuard) @Roles('ADMIN') remove(@TenantId() tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }
}

@Module({ providers: [FacturasService], controllers: [FacturasController] })
export class FacturasModule {}
