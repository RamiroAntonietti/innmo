import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Min } from 'class-validator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { PortalModule } from '../portal/portal.module';
import { PortalService } from '../portal/portal.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';
import { generarCodigo, PREFIJOS } from '../common/utils/codigo.util';

enum FormaPago { EFECTIVO='EFECTIVO', TRANSFERENCIA='TRANSFERENCIA', CHEQUE='CHEQUE', TARJETA='TARJETA' }
enum TipoPago { COMPLETO='COMPLETO', PARCIAL='PARCIAL' }

export class CreateRentalDto {
  @IsString() propiedadId: string;
  @IsString() inquilinoId: string;
  @IsDateString() fechaInicio: string;
  @IsDateString() fechaFin: string;
  @IsNumber() @Min(1, { message: 'El monto debe ser mayor que 0.' }) montoMensual: number;
  @IsNumber() @IsOptional() @Min(0) deposito?: number;
}

export class DevolverDepositoDto {
  @IsString() accion: 'DEVUELTO' | 'RETENIDO';
  @IsString() @IsOptional() notas?: string;
}

export class RenovarContratoDto {
  @IsDateString() fechaFin: string;
  @IsNumber() @IsOptional() @Min(1) montoMensual?: number;
  @IsNumber() @IsOptional() @Min(0) deposito?: number;
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
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private mail: MailService,
    private portal: PortalService,
  ) {}

  private addMonths(d: Date, n: number): Date {
    const r = new Date(d);
    r.setMonth(r.getMonth() + n);
    return r;
  }

  private diffMeses(desde: Date, hasta: Date): number {
    return (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth()) + 1;
  }

  async findOne(tenantId: string, id: string) {
    const contrato = await this.prisma.contratoAlquiler.findFirst({
      where: { id, tenantId },
      include: {
        propiedad: {
          select: {
            titulo: true, direccion: true, ciudad: true, amueblada: true,
            propietario: { select: { nombre: true, apellido: true, email: true, telefono: true } },
            inventario: { orderBy: { nombre: 'asc' } },
          },
        },
        inquilino: { select: { nombre: true, apellido: true, email: true, telefono: true } },
        tenant: { select: { nombre: true } },
      },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    return contrato;
  }

  async findAll(tenantId: string, query: any) {
    const { estado, page = 1, limit = 20 } = query;
    const where: any = { tenantId };
    if (estado) {
      const estados = String(estado).split(',').map((e: string) => e.trim()).filter(Boolean);
      if (estados.length === 1) where.estado = estados[0];
      else if (estados.length > 1) where.estado = { in: estados };
    }

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
    if (!['DISPONIBLE', 'RESERVADO'].includes(propiedad.estado)) {
      throw new BadRequestException(`La propiedad no está disponible para alquiler. Estado actual: ${propiedad.estado}. Solo se pueden alquilar propiedades DISPONIBLES o RESERVADAS.`);
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

    const codigoContrato = generarCodigo(PREFIJOS.CONTRATO);
    const contrato = await this.prisma.$transaction(async (tx) => {
      const c = await tx.contratoAlquiler.create({
        data: {
          tenantId,
          codigo: codigoContrato,
          propiedadId: dto.propiedadId,
          inquilinoId: dto.inquilinoId,
          fechaInicio,
          fechaFin,
          montoMensual: dto.montoMensual,
          deposito: dto.deposito && dto.deposito > 0 ? dto.deposito : null,
          depositoEstado: dto.deposito && dto.deposito > 0 ? 'PENDIENTE' : null,
        },
        include: { propiedad: true, inquilino: true },
      });

      await tx.propiedad.update({
        where: { id: dto.propiedadId },
        data: { estado: 'ALQUILADO' },
      });

      // Generar todas las cuotas mensuales del contrato (máx 60 meses)
      const mesesContrato = this.diffMeses(fechaInicio, fechaFin);
      const cantCuotas = Math.min(Math.max(1, mesesContrato), 60);
      for (let i = 0; i < cantCuotas; i++) {
        const fechaVence = this.addMonths(fechaInicio, i);
        await tx.pagoAlquiler.create({
          data: {
            contratoId: c.id,
            codigo: generarCodigo(PREFIJOS.COBRO),
            monto: dto.montoMensual,
            estado: 'PENDIENTE',
            fechaVence,
          },
        });
      }

      return c;
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'CREATE', entidad: 'contrato',
      entidadId: contrato.id,
      detalle: { propiedad: propiedad.titulo, inquilino: `${inquilino.nombre} ${inquilino.apellido}`, monto: dto.montoMensual },
    });

    // Crear acceso al portal para el inquilino (si tiene email y no tiene acceso)
    let portalAcceso: { email: string; password: string } | null = null;
    if (inquilino.email) {
      try {
        portalAcceso = await this.portal.crearAccesoParaInquilino(tenantId, dto.inquilinoId);
      } catch {
        // Si falla (ej. tabla portal_accesos no existe), el contrato se crea igual
      }
    }

    return { ...contrato, portalAcceso };
  }

  async registerPayment(tenantId: string, contratoId: string, dto: RegisterPaymentDto, usuarioId?: string) {
    const contrato = await this.prisma.contratoAlquiler.findFirst({
      where: { id: contratoId, tenantId },
      include: {
        propiedad: { select: { titulo: true } },
        inquilino: { select: { nombre: true, apellido: true, email: true } },
      },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    if (contrato.estado === 'ANULADO') throw new BadRequestException('No se pueden registrar pagos en un contrato anulado.');

    const pendiente = await this.prisma.pagoAlquiler.findFirst({
      where: { contratoId, estado: { in: ['PENDIENTE', 'ATRASADO'] } },
      orderBy: [{ fechaVence: 'asc' }, { createdAt: 'asc' }],
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
        await tx.pagoAlquiler.create({
          data: { contratoId, codigo: generarCodigo(PREFIJOS.COBRO), monto: saldo, estado: 'PENDIENTE', fechaVence: pendiente.fechaVence },
        });
      }
      // Si es COMPLETO, no crear nuevo pago: las cuotas ya están pre-generadas
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'PAGO', entidad: 'contrato',
      entidadId: contratoId, detalle: { monto: montoPagado, tipo: tipoPago, forma: dto.formaPago },
    });

    // Enviar notificación de pago al inquilino (si tiene email)
    const emailInq = contrato.inquilino?.email;
    if (emailInq) {
      this.mail.sendPaymentRegistered(emailInq, {
        nombreInquilino: `${contrato.inquilino.nombre} ${contrato.inquilino.apellido}`,
        email: emailInq,
        propiedad: contrato.propiedad?.titulo || 'Propiedad',
        monto: String(montoPagado),
        fechaPago: new Date(dto.fechaPago).toLocaleDateString('es-AR'),
        formaPago: dto.formaPago,
      }).catch((err) => console.error('Error enviando email de pago:', err?.message));
    }

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

  async devolverDeposito(tenantId: string, contratoId: string, dto: DevolverDepositoDto, usuarioId?: string) {
    const contrato = await this.prisma.contratoAlquiler.findFirst({
      where: { id: contratoId, tenantId },
      include: { propiedad: { select: { titulo: true } }, inquilino: { select: { nombre: true, apellido: true } } },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    if (!contrato.deposito || Number(contrato.deposito) <= 0) {
      throw new BadRequestException('Este contrato no tiene depósito registrado.');
    }
    if (contrato.depositoEstado && contrato.depositoEstado !== 'PENDIENTE') {
      throw new BadRequestException(`El depósito ya fue ${contrato.depositoEstado === 'DEVUELTO' ? 'devuelto' : 'retenido'}.`);
    }

    await this.prisma.contratoAlquiler.update({
      where: { id: contratoId },
      data: {
        depositoEstado: dto.accion,
        depositoDevueltoAt: new Date(),
        depositoNotas: dto.notas?.trim() || null,
      },
    });

    await this.audit.log({
      tenantId, usuarioId, accion: dto.accion === 'DEVUELTO' ? 'DEPOSITO_DEVUELTO' : 'DEPOSITO_RETENIDO', entidad: 'contrato',
      entidadId: contratoId, detalle: { monto: Number(contrato.deposito), accion: dto.accion, notas: dto.notas },
    });

    return { success: true, message: dto.accion === 'DEVUELTO' ? 'Depósito registrado como devuelto.' : 'Depósito registrado como retenido.' };
  }

  async renovar(tenantId: string, contratoId: string, dto: RenovarContratoDto, usuarioId?: string) {
    const viejo = await this.prisma.contratoAlquiler.findFirst({
      where: { id: contratoId, tenantId },
      include: { propiedad: true, inquilino: true },
    });
    if (!viejo) throw new NotFoundException('Contrato no encontrado.');
    if (viejo.estado === 'ANULADO') throw new BadRequestException('No se puede renovar un contrato anulado.');

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fechaFinVieja = new Date(viejo.fechaFin);
    const fechaInicioNueva = fechaFinVieja >= hoy ? fechaFinVieja : hoy;
    const fechaFinNueva = new Date(dto.fechaFin);
    if (fechaInicioNueva >= fechaFinNueva) {
      throw new BadRequestException('La fecha de fin del nuevo contrato debe ser posterior al inicio.');
    }

    const montoMensual = dto.montoMensual ?? Number(viejo.montoMensual);
    const deposito = dto.deposito !== undefined ? (dto.deposito > 0 ? dto.deposito : null) : viejo.deposito ? Number(viejo.deposito) : null;

    const codigoContrato = generarCodigo(PREFIJOS.CONTRATO);
    const contrato = await this.prisma.$transaction(async (tx) => {
      if (viejo.estado === 'ACTIVO' || viejo.estado === 'ATRASADO') {
        await tx.contratoAlquiler.update({
          where: { id: contratoId },
          data: { estado: 'FINALIZADO' as any },
        });
      }

      const c = await tx.contratoAlquiler.create({
        data: {
          tenantId,
          codigo: codigoContrato,
          propiedadId: viejo.propiedadId,
          inquilinoId: viejo.inquilinoId,
          fechaInicio: fechaInicioNueva,
          fechaFin: fechaFinNueva,
          montoMensual,
          deposito,
          depositoEstado: deposito ? 'PENDIENTE' : null,
        },
        include: { propiedad: true, inquilino: true },
      });

      const mesesContrato = this.diffMeses(fechaInicioNueva, fechaFinNueva);
      const cantCuotas = Math.min(Math.max(1, mesesContrato), 60);
      for (let i = 0; i < cantCuotas; i++) {
        const fechaVence = this.addMonths(fechaInicioNueva, i);
        await tx.pagoAlquiler.create({
          data: {
            contratoId: c.id,
            codigo: generarCodigo(PREFIJOS.COBRO),
            monto: montoMensual,
            estado: 'PENDIENTE',
            fechaVence,
          },
        });
      }

      return c;
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'RENOVAR', entidad: 'contrato',
      entidadId: contrato.id, detalle: { desdeContrato: contratoId, propiedad: viejo.propiedad?.titulo, inquilino: `${viejo.inquilino?.nombre} ${viejo.inquilino?.apellido}` },
    });

    return { ...contrato, mensaje: 'Contrato renovado correctamente.' };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async finalizarContratosVencidos() {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const actualizados = await this.prisma.contratoAlquiler.updateMany({
      where: {
        estado: { in: ['ACTIVO', 'ATRASADO'] },
        fechaFin: { lt: hoy },
      },
      data: { estado: 'FINALIZADO' as any },
    });
    if (actualizados.count > 0) {
      console.log(`[Rentals] ${actualizados.count} contrato(s) marcado(s) como FINALIZADO por vencimiento.`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async actualizarEstadoAtrasado() {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

    // 1. Pagos PENDIENTES con fechaVence vencida → ATRASADO
    const pagosAtrasados = await this.prisma.pagoAlquiler.updateMany({
      where: { estado: 'PENDIENTE', fechaVence: { lt: hoy } },
      data: { estado: 'ATRASADO' as any },
    });
    if (pagosAtrasados.count > 0) {
      console.log(`[Rentals] ${pagosAtrasados.count} pago(s) marcado(s) como ATRASADO.`);
    }

    // 2. Contratos ACTIVOS con pagos vencidos sin abonar → ATRASADO
    const contratosConPagosVencidos = await this.prisma.contratoAlquiler.findMany({
      where: {
        estado: 'ACTIVO',
        fechaFin: { gte: hoy },
        pagos: {
          some: {
            estado: { in: ['PENDIENTE', 'ATRASADO'] },
            fechaVence: { lt: hoy },
          },
        },
      },
      select: { id: true },
    });
    if (contratosConPagosVencidos.length > 0) {
      await this.prisma.contratoAlquiler.updateMany({
        where: { id: { in: contratosConPagosVencidos.map((c) => c.id) } },
        data: { estado: 'ATRASADO' as any },
      });
      console.log(`[Rentals] ${contratosConPagosVencidos.length} contrato(s) marcado(s) como ATRASADO por pagos vencidos.`);
    }

    // 3. Contratos ATRASADOS sin pagos vencidos pendientes → ACTIVO
    const contratosALiquidar = await this.prisma.contratoAlquiler.findMany({
      where: {
        estado: 'ATRASADO',
        fechaFin: { gte: hoy },
        NOT: {
          pagos: {
            some: {
              estado: { in: ['PENDIENTE', 'ATRASADO'] },
              fechaVence: { lt: hoy },
            },
          },
        },
      },
      select: { id: true },
    });
    if (contratosALiquidar.length > 0) {
      await this.prisma.contratoAlquiler.updateMany({
        where: { id: { in: contratosALiquidar.map((c) => c.id) } },
        data: { estado: 'ACTIVO' as any },
      });
      console.log(`[Rentals] ${contratosALiquidar.length} contrato(s) vuelto(s) a ACTIVO (sin pagos vencidos).`);
    }
  }

  async getPaymentsByContract(tenantId: string, contratoId: string) {
    const contrato = await this.prisma.contratoAlquiler.findFirst({
      where: { id: contratoId, tenantId },
      include: { propiedad: { select: { titulo: true } }, inquilino: { select: { nombre: true, apellido: true } } },
    });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    const pagos = await this.prisma.pagoAlquiler.findMany({
      where: { contratoId },
      orderBy: { fechaVence: 'asc' },
    });
    return pagos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      monto: Number(p.monto),
      montoPagado: p.montoPagado ? Number(p.montoPagado) : null,
      estado: p.estado,
      fechaVence: p.fechaVence,
      fechaPago: p.fechaPago,
      formaPago: p.formaPago,
      tipoPago: p.tipoPago,
      createdAt: p.createdAt,
    }));
  }

  async getPendingPayments(tenantId: string) {
    const pagos = await this.prisma.pagoAlquiler.findMany({
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

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return pagos.map((p) => {
      const fechaVencimiento = p.fechaVence ? new Date(p.fechaVence) : null;
      const diasAtraso = fechaVencimiento && fechaVencimiento < hoy
        ? Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / 86400000)
        : 0;
      return { ...p, fechaVencimiento: fechaVencimiento?.toISOString() ?? null, diasAtraso };
    });
  }
}

@Controller('rentals')
@UseGuards(JwtAuthGuard)
export class RentalsController {
  constructor(private svc: RentalsService) {}

  @Get() findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }

  @Get('payments/pending') pending(@TenantId() tid: string) { return this.svc.getPendingPayments(tid); }

  @Get(':id')
  findOne(@TenantId() tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }

  @Get(':id/payments')
  getPayments(@TenantId() tid: string, @Param('id') id: string) { return this.svc.getPaymentsByContract(tid, id); }

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

  @Patch(':id/deposito/devolver')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  devolverDeposito(@TenantId() tid: string, @Param('id') id: string, @Body() dto: DevolverDepositoDto, @CurrentUser('sub') uid: string) {
    return this.svc.devolverDeposito(tid, id, dto, uid);
  }

  @Post(':id/renovar')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'AGENTE')
  renovar(@TenantId() tid: string, @Param('id') id: string, @Body() dto: RenovarContratoDto, @CurrentUser('sub') uid: string) {
    return this.svc.renovar(tid, id, dto, uid);
  }
}

@Module({ imports: [AuditModule, PortalModule], providers: [RentalsService], controllers: [RentalsController], exports: [RentalsService] })
export class RentalsModule {}
