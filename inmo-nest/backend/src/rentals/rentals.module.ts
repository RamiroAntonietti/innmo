import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min } from 'class-validator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId } from '../common/decorators/user.decorator';

enum FormaPago { EFECTIVO='EFECTIVO', TRANSFERENCIA='TRANSFERENCIA', CHEQUE='CHEQUE', TARJETA='TARJETA' }
enum TipoPago { COMPLETO='COMPLETO', PARCIAL='PARCIAL' }

export class CreateRentalDto {
  @IsString() propiedadId: string;
  @IsString() inquilinoId: string;
  @IsDateString() fechaInicio: string;
  @IsDateString() fechaFin: string;
  @IsNumber() @Min(0) montoMensual: number;
}

export class RegisterPaymentDto {
  @IsNumber() @Min(0) monto: number;
  @IsDateString() fechaPago: string;
  @IsEnum(FormaPago) @IsOptional() formaPago?: FormaPago;
  @IsEnum(TipoPago) @IsOptional() tipoPago?: TipoPago;
  @IsNumber() @IsOptional() montoPagado?: number;
  @IsString() @IsOptional() notas?: string;
}

@Injectable()
export class RentalsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, query: any) {
    const { estado, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (estado) where.estado = estado;

    const [data, total] = await Promise.all([
      this.prisma.contratoAlquiler.findMany({
        where, skip: (page-1)*limit, take: Number(limit),
        include: {
          propiedad: { select: { titulo: true, direccion: true } },
          inquilino: { select: { nombre: true, apellido: true, email: true, telefono: true } },
          pagos: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.contratoAlquiler.count({ where }),
    ]);
    return { data, total };
  }

  async create(tenantId: string, dto: CreateRentalDto) {
    const contrato = await this.prisma.contratoAlquiler.create({
      data: {
        tenantId,
        propiedadId: dto.propiedadId,
        inquilinoId: dto.inquilinoId,
        fechaInicio: new Date(dto.fechaInicio),
        fechaFin: new Date(dto.fechaFin),
        montoMensual: dto.montoMensual,
      },
      include: { propiedad: true, inquilino: true },
    });
    await this.prisma.pagoAlquiler.create({
      data: {
        contratoId: contrato.id,
        monto: dto.montoMensual,
        estado: 'PENDIENTE',
        fechaPago: new Date(dto.fechaInicio),
      },
    });
    return contrato;
  }

  async registerPayment(tenantId: string, contratoId: string, dto: RegisterPaymentDto) {
    const contrato = await this.prisma.contratoAlquiler.findFirst({ where: { id: contratoId, tenantId } });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');

    const pendiente = await this.prisma.pagoAlquiler.findFirst({
      where: { contratoId, estado: { in: ['PENDIENTE', 'ATRASADO'] } },
      orderBy: { createdAt: 'asc' },
    });
    if (!pendiente) throw new BadRequestException('No hay pagos pendientes.');

    const tipoPago = dto.tipoPago || 'COMPLETO';
    const montoPagado = tipoPago === 'PARCIAL' ? dto.montoPagado : dto.monto;

    await this.prisma.pagoAlquiler.update({
      where: { id: pendiente.id },
      data: {
        estado: tipoPago === 'PARCIAL' ? 'PARCIAL' : 'PAGADO',
        fechaPago: new Date(dto.fechaPago),
        formaPago: dto.formaPago,
        tipoPago,
        montoPagado,
        notas: dto.notas,
      },
    });

    if (tipoPago === 'PARCIAL') {
      const saldo = Number(pendiente.monto) - Number(montoPagado);
      await this.prisma.pagoAlquiler.create({
        data: { contratoId, monto: saldo, estado: 'PENDIENTE' },
      });
    } else {
      await this.prisma.pagoAlquiler.create({
        data: { contratoId, monto: contrato.montoMensual, estado: 'PENDIENTE' },
      });
    }

    return { success: true };
  }

  async anular(tenantId: string, contratoId: string) {
    const contrato = await this.prisma.contratoAlquiler.findFirst({ where: { id: contratoId, tenantId } });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    if (contrato.estado === 'ANULADO') throw new BadRequestException('El contrato ya está anulado.');
    return this.prisma.contratoAlquiler.update({
      where: { id: contratoId },
      data: { estado: 'ANULADO' as any },
    });
  }

  async getPendingPayments(tenantId: string) {
    return this.prisma.pagoAlquiler.findMany({
      where: {
        estado: { in: ['PENDIENTE', 'ATRASADO'] },
        contrato: { tenantId },
      },
      include: {
        contrato: {
          include: {
            inquilino: { select: { nombre: true, apellido: true, email: true, telefono: true } },
            propiedad: { select: { titulo: true, direccion: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

@Controller('rentals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RentalsController {
  constructor(private svc: RentalsService) {}

  @Get() findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }

  @Get('payments/pending')
  pending(@TenantId() tid: string) { return this.svc.getPendingPayments(tid); }

  @Post() @Roles('ADMIN','AGENTE')
  create(@TenantId() tid: string, @Body() dto: CreateRentalDto) { return this.svc.create(tid, dto); }

  @Post(':id/anular') @Roles('ADMIN')
  anular(@TenantId() tid: string, @Param('id') id: string) { return this.svc.anular(tid, id); }

  @Post(':id/payments') @Roles('ADMIN','AGENTE')
  payment(@TenantId() tid: string, @Param('id') id: string, @Body() dto: RegisterPaymentDto) {
    return this.svc.registerPayment(tid, id, dto);
  }
}

@Module({ providers: [RentalsService], controllers: [RentalsController] })
export class RentalsModule {}
