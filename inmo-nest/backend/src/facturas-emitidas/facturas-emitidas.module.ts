import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsInt, Min, MinLength } from 'class-validator';
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';
import { generarCodigo } from '../common/utils/codigo.util';

// Tipos de comprobante AFIP
export const TIPOS_COMPROBANTE = ['A', 'B', 'C', 'E', 'M'] as const;

export class CreateFacturaEmitidaDto {
  @IsString() clienteId: string;
  @IsString() tipoComprobante: string;
  @IsInt() @Min(1) puntoVenta: number;
  @IsString() @IsOptional() descripcion?: string;
  @IsNumber() @Min(0.01) montoNeto: number;
  @IsNumber() @IsOptional() @Min(0) montoIva?: number;
  @IsInt() @IsOptional() concepto?: number; // 1=productos, 2=servicios, 3=mixto
  @IsString() @IsOptional() operacionVentaId?: string;
}

export class UpdateFacturaEmitidaDto {
  @IsString() @IsOptional() descripcion?: string;
  @IsNumber() @IsOptional() @Min(0.01) montoNeto?: number;
  @IsNumber() @IsOptional() @Min(0) montoIva?: number;
}

@Injectable()
export class FacturasEmitidasService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll(tenantId: string, query: any) {
    const { clienteId, estado, page = 1, limit = 50 } = query;
    const where: any = { tenantId };
    if (clienteId) where.clienteId = clienteId;
    if (estado) where.estado = estado;

    const [data, total] = await Promise.all([
      this.prisma.facturaEmitida.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: { cliente: { select: { nombre: true, apellido: true, cuit: true } } },
        orderBy: { fechaEmision: 'desc' },
      }),
      this.prisma.facturaEmitida.count({ where }),
    ]);
    return { data, total, page: Number(page), limit: Number(limit) };
  }

  async findOne(tenantId: string, id: string) {
    const f = await this.prisma.facturaEmitida.findFirst({
      where: { id, tenantId },
      include: { cliente: true },
    });
    if (!f) throw new NotFoundException('Factura no encontrada.');
    return f;
  }

  async create(tenantId: string, dto: CreateFacturaEmitidaDto, usuarioId?: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.clienteId, tenantId, deletedAt: null },
    });
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');
    if (!cliente.requiereFactura && !cliente.cuit) {
      throw new BadRequestException('El cliente debe tener datos fiscales para facturar.');
    }

    const montoIva = dto.montoIva ?? 0;
    const montoTotal = Number(dto.montoNeto) + montoIva;
    const codigo = generarCodigo('FAC');

    const factura = await this.prisma.facturaEmitida.create({
      data: {
        tenantId,
        clienteId: dto.clienteId,
        codigo,
        tipoComprobante: dto.tipoComprobante,
        puntoVenta: dto.puntoVenta,
        fechaEmision: new Date(),
        concepto: dto.concepto ?? 2,
        descripcion: dto.descripcion,
        montoNeto: dto.montoNeto,
        montoIva,
        montoTotal,
        estado: 'BORRADOR',
        operacionVentaId: dto.operacionVentaId,
      },
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'CREATE', entidad: 'factura_emitida',
      entidadId: factura.id, detalle: { montoTotal, tipoComprobante: dto.tipoComprobante },
    });

    return factura;
  }

  async update(tenantId: string, id: string, dto: UpdateFacturaEmitidaDto, usuarioId?: string) {
    const f = await this.findOne(tenantId, id);
    if (f.estado !== 'BORRADOR' && f.estado !== 'RECHAZADA') {
      throw new BadRequestException('Solo se pueden editar facturas en BORRADOR o RECHAZADA.');
    }

    const montoNeto = dto.montoNeto ?? parseFloat(f.montoNeto.toString());
    const montoIva = dto.montoIva ?? parseFloat(f.montoIva.toString());
    const montoTotal = montoNeto + montoIva;

    const updated = await this.prisma.facturaEmitida.update({
      where: { id },
      data: {
        ...(dto.descripcion !== undefined && { descripcion: dto.descripcion }),
        ...(dto.montoNeto !== undefined && { montoNeto: dto.montoNeto }),
        ...(dto.montoIva !== undefined && { montoIva: dto.montoIva }),
        montoTotal,
      },
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'UPDATE', entidad: 'factura_emitida', entidadId: id, detalle: dto,
    });

    return updated;
  }

  /** Placeholder: enviar a AFIP/ARCA. Por implementar. */
  async enviarAfip(tenantId: string, id: string, usuarioId?: string) {
    const f = await this.findOne(tenantId, id);
    if (f.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se pueden enviar facturas en BORRADOR.');
    }
    // TODO: Integración con WSFE/WSBFEV1 de AFIP
    // Por ahora solo cambia a PENDIENTE_AFIP como placeholder
    const updated = await this.prisma.facturaEmitida.update({
      where: { id },
      data: { estado: 'PENDIENTE_AFIP' },
    });
    await this.audit.log({
      tenantId, usuarioId, accion: 'ENVIAR_AFIP', entidad: 'factura_emitida', entidadId: id,
    });
    return { ...updated, mensaje: 'Integración AFIP pendiente de implementación.' };
  }

  async remove(tenantId: string, id: string, usuarioId?: string) {
    const f = await this.findOne(tenantId, id);
    if (f.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se pueden eliminar facturas en BORRADOR.');
    }
    await this.prisma.facturaEmitida.delete({ where: { id } });
    await this.audit.log({
      tenantId, usuarioId, accion: 'DELETE', entidad: 'factura_emitida', entidadId: id,
    });
    return { message: 'Factura eliminada.' };
  }
}

@Controller('facturas-emitidas')
@UseGuards(JwtAuthGuard)
export class FacturasEmitidasController {
  constructor(private svc: FacturasEmitidasService) {}

  @Get() findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Get(':id') findOne(@TenantId() tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }

  @Post()
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  create(@TenantId() tid: string, @Body() dto: CreateFacturaEmitidaDto, @CurrentUser('sub') uid: string) {
    return this.svc.create(tid, dto, uid);
  }

  @Put(':id')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateFacturaEmitidaDto, @CurrentUser('sub') uid: string) {
    return this.svc.update(tid, id, dto, uid);
  }

  @Post(':id/enviar-afip')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  enviarAfip(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) {
    return this.svc.enviarAfip(tid, id, uid);
  }

  @Delete(':id')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) {
    return this.svc.remove(tid, id, uid);
  }
}

@Module({
  imports: [AuditModule],
  providers: [FacturasEmitidasService],
  controllers: [FacturasEmitidasController],
})
export class FacturasEmitidasModule {}
