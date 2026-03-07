import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min } from 'class-validator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';

enum FormaPago { EFECTIVO='EFECTIVO', TRANSFERENCIA='TRANSFERENCIA', CHEQUE='CHEQUE', TARJETA='TARJETA' }
enum TipoPago { COMPLETO='COMPLETO', PARCIAL='PARCIAL' }

export class CreateRentalDto {
  @IsString() propiedadId: string;
  @IsString() inquilinoId: string;
  @IsDateString() fechaInicio: string;
  @IsDateString() fechaFin: string;
  @IsNumber() @Min(1, { message: 'El monto debe ser mayor que 0.' }) montoMensual: number;
}

export class RegisterPaymentDto {
  @IsNumber() @Min(0.01, { message: 'El monto debe ser mayor que 0.' }) monto: number;
  @IsDateString() fechaPago: string;
  @IsEnum(FormaPago) @IsOptional() formaPago?: FormaPago;
  @IsEnum(TipoPago) @IsOptional() tipoPago?: TipoPago;
  @IsNumber() @IsOptional() @Min(0) montoPagado?: number;
  @IsString() @IsOptional() notas?: string;
}

@Injectable()
export class RentalsService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async findAll(tenantId: string, query: any) {
    const { estado, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (estado) where.estado = estado;

    const [data, total] = await Promise.all([
      this.prisma.contratoAlquiler.findMany({
        where, skip: (Number(page)-1)*Number(limit), take: Number(limit),
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

  async create(tenantId: string, dto: CreateRentalDto, usuarioId?: string) {
    // Validar fechas
    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFin = new Date(dto.fechaFin);
    if (fechaInicio >= fechaFin) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin.');
    }

    // Validar propiedad
    const propiedad = await this.prisma.propiedad.findFirst({
      where: { id: dto.propiedadId, tenantId, deletedAt: null },
    });
    if (!propiedad) throw new NotFoundException('Propiedad no encontrada.');
    if (propiedad.estado !== 'DISPONIBLE') {
      throw new BadRequestException(`La propiedad no está disponible. Estado actual: ${propiedad.estado}.`);
    }

    // Validar inquilino
    const inquilino = await this.prisma.cliente.findFirst({
      where: { id: dto.inquilinoId, tenantId, deletedAt: null },
    });
    if (!inquilino) throw new NotFoundException('Inquilino no encontrado.');
    if (inquilino.tipo !== 'INQUILINO') {
      throw new BadRequestException('El cliente seleccionado no es de tipo INQUILINO.');
    }

    // Verificar que no haya contrato activo para la misma propiedad
    const contratoActivo = await this.prisma.contratoAlquiler.findFirst({
      where: { propiedadId: dto.propiedadId, estado: { in: ['ACTIVO', 'ATRASADO'] } },
    });
    if (contratoActivo) {
      throw new BadRequestException('La propiedad ya tiene un contrato activo.');
    }

    const contrato = await this.prisma.$transaction(async (tx) => {
      const c = await tx.contratoAlquiler.create({
        data: {
          tenantId,
          propiedadId: dto.propiedadId,
          inquilinoId: dto.inquilinoId,
          fechaInicio,
          fechaFin,
          montoMensual: dto.montoMensual,
        },
        include: { propiedad: true, inquilino: true },
      });

      // Cambiar estado de propiedad a ALQUILADO
      await tx.propiedad.update({
        where: { id: dto.propiedadId },
        data: { estado: 'ALQUILADO' },
      });

      // Crear primer pago pendiente
      await tx.pagoAlquiler.create({
        data: { contratoId: c.id, monto: dto.montoMensual, estado: 'PENDIENTE', fechaPago: fechaInicio },
      });

      return c;
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'CREATE', entidad: 'contrato',
      entidadId: contrato.id,
      detalle: { propiedad: propiedad.titulo, inquilino: `${inquilino.nombre} ${inquilino.apellido}`, monto: dto.montoMensual },
    });

    return contrato;
  }

  async registerPayment(tenantId: string, contratoId: string, dto: RegisterPaymentDto, usuarioId?: string) {
    const contrato = await this.prisma.contratoAlquiler.findFirst({ where: { id: contratoId, tenantId } });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    if (contrato.estado === 'ANULADO') throw new BadRequestException('No se pueden registrar pagos en un contrato anulado.');

    const pendiente = await this.prisma.pagoAlquiler.findFirst({
      where: { contratoId, estado: { in: ['PENDIENTE', 'ATRASADO'] } },
      orderBy: { createdAt: 'asc' },
    });
    if (!pendiente) throw new BadRequestException('No hay pagos pendientes para este contrato.');

    const tipoPago = dto.tipoPago || 'COMPLETO';
    const montoPagado = tipoPago === 'PARCIAL' ? (dto.montoPagado || dto.monto) : dto.monto;

    // Validar que el monto no supere el saldo pendiente
    if (montoPagado > Number(pendiente.monto)) {
      throw new BadRequestException(`El monto pagado ($${montoPagado}) supera el saldo pendiente ($${pendiente.monto}).`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.pagoAlquiler.update({
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
        await tx.pagoAlquiler.create({ data: { contratoId, monto: saldo, estado: 'PENDIENTE' } });
      } else {
        await tx.pagoAlquiler.create({ data: { contratoId, monto: contrato.montoMensual, estado: 'PENDIENTE' } });
      }
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'PAGO', entidad: 'contrato',
      entidadId: contratoId, detalle: { monto: montoPagado, tipo: tipoPago, forma: dto.formaPago },
    });

    return { success: true };
  }

  async anular(tenantId: string, contratoId: string, usuarioId?: string) {
    const contrato = await this.prisma.contratoAlquiler.findFirst({
      where: { id: contratoId, tenantId },
      include: { propiedad: true },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    if (contrato.estado === 'ANULADO') throw new BadRequestException('El contrato ya está anulado.');

    await this.prisma.$transaction(async (tx) => {
      await tx.contratoAlquiler.update({
        where: { id: contratoId },
        data: { estado: 'ANULADO' as any },
      });

      // Liberar propiedad
      await tx.propiedad.update({
        where: { id: contrato.propiedadId },
        data: { estado: 'DISPONIBLE' },
      });

      // Cancelar pagos pendientes futuros
      await tx.pagoAlquiler.updateMany({
        where: { contratoId, estado: { in: ['PENDIENTE', 'ATRASADO'] } },
        data: { estado: 'ATRASADO' }, // mantener pero no borrar
      });
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'ANULAR', entidad: 'contrato',
      entidadId: contratoId, detalle: { propiedad: contrato.propiedad?.titulo },
    });

    return { success: true, message: 'Contrato anulado correctamente.' };
  }

  async getPendingPayments(tenantId: string) {
    return this.prisma.pagoAlquiler.findMany({
      where: { contrato: { tenantId }, estado: { in: ['PENDIENTE', 'ATRASADO'] } },
      include: {
        contrato: {
          include: {
            propiedad: { select: { titulo: true } },
            inquilino: { select: { nombre: true, apellido: true, telefono: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

@Controller('rentals')
@UseGuards(JwtAuthGuard)
export class RentalsController {
  constructor(private svc: RentalsService) {}

  @Get() findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }

  @Get('payments/pending') pending(@TenantId() tid: string) { return this.svc.getPendingPayments(tid); }

  @Post()
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  create(@TenantId() tid: string, @Body() dto: CreateRentalDto, @CurrentUser('sub') uid: string) {
    return this.svc.create(tid, dto, uid);
  }

  @Post(':id/anular')
  @UseGuards(RolesGuard) @Roles('ADMIN')
  anular(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) {
    return this.svc.anular(tid, id, uid);
  }

  @Post(':id/payments')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  registerPayment(@TenantId() tid: string, @Param('id') id: string, @Body() dto: RegisterPaymentDto, @CurrentUser('sub') uid: string) {
    return this.svc.registerPayment(tid, id, dto, uid);
  }
}

@Module({ imports: [AuditModule], providers: [RentalsService], controllers: [RentalsController] })
export class RentalsModule {}
