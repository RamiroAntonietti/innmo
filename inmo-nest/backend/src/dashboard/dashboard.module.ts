import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { TenantId } from '../common/decorators/user.decorator';

// ── Dashboard ──
@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(tenantId: string) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const en30 = new Date(hoy); en30.setDate(en30.getDate() + 30);
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    // Secuencial para evitar timeout con connection_limit=1 (Supabase free tier)
    const clientes = await this.prisma.cliente.count({ where: { tenantId } });
    const propiedades = await this.prisma.propiedad.count({ where: { tenantId } });
    const contratos = await this.prisma.contratoAlquiler.count({ where: { tenantId, estado: 'ACTIVO' } });
    const pagosAtrasados = await this.prisma.pagoAlquiler.count({ where: { contrato: { tenantId }, estado: 'ATRASADO' } });
    const contratosPorVencer = await this.prisma.contratoAlquiler.count({
      where: { tenantId, estado: { in: ['ACTIVO', 'ATRASADO'] }, fechaFin: { gte: hoy, lte: en30 } },
    });
    const consultasSinLeer = await this.prisma.consultaPortal.count({ where: { tenantId, leido: false } });
    const ingresosMes = await this.prisma.pagoAlquiler.aggregate({
      where: { contrato: { tenantId }, estado: 'PAGADO', fechaPago: { gte: inicioMes } },
      _sum: { monto: true },
    });
    const ingresosProyectados = await this.prisma.pagoAlquiler.aggregate({
      where: {
        contrato: { tenantId },
        estado: { in: ['PENDIENTE', 'ATRASADO'] },
        fechaVence: { gte: inicioMes, lte: finMes },
      },
      _sum: { monto: true },
    });

    return {
      clientes,
      propiedades,
      contratos,
      pagosAtrasados,
      contratosPorVencer,
      consultasSinLeer,
      ingresosMes: ingresosMes._sum.monto || 0,
      ingresosProyectados: ingresosProyectados._sum.monto || 0,
    };
  }

  async getNotificaciones(tenantId: string) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const en7 = new Date(hoy); en7.setDate(en7.getDate() + 7);

    // Secuencial para evitar timeout con connection_limit=1 (Supabase free tier)
    const pagosVencidos = await this.prisma.pagoAlquiler.count({ where: { contrato: { tenantId }, estado: { in: ['ATRASADO'] } } });
    const pagosPronto = await this.prisma.pagoAlquiler.count({ where: { contrato: { tenantId }, estado: 'PENDIENTE' } });
    const facturasVencidas = await this.prisma.facturaServicio.count({ where: { tenantId, estado: 'PENDIENTE', fechaVence: { lt: hoy } } });
    const facturasProntas = await this.prisma.facturaServicio.count({ where: { tenantId, estado: 'PENDIENTE', fechaVence: { gte: hoy, lte: en7 } } });
    const tareasVencidas = await this.prisma.tarea.count({ where: { tenantId, estado: { in: ['PENDIENTE', 'EN_PROGRESO'] }, fechaVence: { lt: hoy } } });
    const consultasNoLeidas = await this.prisma.consultaPortal.findMany({ where: { tenantId, leido: false }, include: { cliente: true }, orderBy: { createdAt: 'desc' }, take: 20 });

    const items: any[] = [];
    if (pagosVencidos > 0) items.push({ tipo: 'PAGO_VENCIDO', mensaje: `${pagosVencidos} pago(s) atrasado(s)`, ruta: '/app/payments', urgente: true });
    if (pagosPronto > 0) items.push({ tipo: 'PAGO_PROXIMO', mensaje: `${pagosPronto} pago(s) pendiente(s)`, ruta: '/app/payments', urgente: false });
    if (facturasVencidas > 0) items.push({ tipo: 'FACTURA_VENCIDA', mensaje: `${facturasVencidas} servicio(s) por propiedad vencido(s)`, ruta: '/app/service-invoices', urgente: true });
    if (facturasProntas > 0) items.push({ tipo: 'FACTURA_PROXIMA', mensaje: `${facturasProntas} servicio(s) vencen en 7 días`, ruta: '/app/service-invoices', urgente: false });
    if (tareasVencidas > 0) items.push({ tipo: 'TAREA_VENCIDA', mensaje: `${tareasVencidas} tarea(s) vencida(s)`, ruta: '/app/tasks', urgente: true });
    for (const c of consultasNoLeidas) {
      const nombre = `${c.cliente?.nombre || ''} ${c.cliente?.apellido || ''}`.trim() || 'Cliente';
      const rol = c.rol === 'INQUILINO' ? 'inquilino' : 'propietario';
      const preview = c.mensaje.length > 60 ? c.mensaje.slice(0, 60) + '…' : c.mensaje;
      items.push({ tipo: 'CONSULTA_PORTAL', id: c.id, mensaje: `${nombre} (${rol}): ${preview}`, ruta: '/app/inquiries', urgente: true });
    }

    return { total: items.length, urgentes: items.filter(i => i.urgente).length, items };
  }
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private svc: DashboardService) {}

  @Get('stats') stats(@TenantId() tid: string) { return this.svc.getStats(tid); }

  @Get('notificaciones') notificaciones(@TenantId() tid: string) { return this.svc.getNotificaciones(tid); }
}

// ── DTO responder consulta ──
export class ResponderConsultaDto {
  @IsString() @MinLength(1, { message: 'La respuesta no puede estar vacía.' }) respuesta: string;
  @IsOptional() @IsBoolean() enviarEmail?: boolean;
}

// ── Consultas Portal ──
@Injectable()
export class ConsultasService {
  constructor(private prisma: PrismaService, private mail: MailService) {}

  async findAll(tenantId: string) {
    return this.prisma.consultaPortal.findMany({
      where: { tenantId },
      include: { cliente: { select: { id: true, nombre: true, apellido: true, email: true, tipo: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async marcarLeido(tenantId: string, id: string) {
    await this.prisma.consultaPortal.updateMany({
      where: { id, tenantId },
      data: { leido: true },
    });
    return { success: true };
  }

  async responder(tenantId: string, id: string, dto: ResponderConsultaDto) {
    const consulta = await this.prisma.consultaPortal.findFirst({
      where: { id, tenantId },
      include: { cliente: true, tenant: true },
    });
    if (!consulta) throw new NotFoundException('Consulta no encontrada.');

    const respuesta = dto.respuesta?.trim();
    if (!respuesta) throw new BadRequestException('La respuesta no puede estar vacía.');

    await this.prisma.consultaPortal.update({
      where: { id },
      data: { respuesta, respuestaAt: new Date(), leido: true },
    });

    if (dto.enviarEmail && consulta.cliente?.email) {
      this.mail.sendConsultaRespuesta(consulta.cliente.email, {
        nombreCliente: `${consulta.cliente.nombre} ${consulta.cliente.apellido}`,
        nombreInmobiliaria: consulta.tenant?.nombre || 'Inmobiliaria',
        respuesta,
      }).catch((err) => console.error('Error enviando email de respuesta:', err?.message));
    }

    return { success: true, enviadoEmail: !!dto.enviarEmail };
  }
}

@Controller('consultas')
@UseGuards(JwtAuthGuard)
export class ConsultasController {
  constructor(private svc: ConsultasService) {}

  @Get() findAll(@TenantId() tid: string) { return this.svc.findAll(tid); }

  @Patch(':id/leido')
  marcarLeido(@TenantId() tid: string, @Param('id') id: string) { return this.svc.marcarLeido(tid, id); }

  @Patch(':id/responder')
  responder(@TenantId() tid: string, @Param('id') id: string, @Body() dto: ResponderConsultaDto) {
    return this.svc.responder(tid, id, dto);
  }
}

@Module({ providers: [DashboardService, ConsultasService], controllers: [DashboardController, ConsultasController] })
export class DashboardModule {}

// ── Reports ──
@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getPagosUltimos6Meses(tenantId: string) {
    const desde = new Date();
    desde.setMonth(desde.getMonth() - 6);
    return this.prisma.pagoAlquiler.findMany({
      where: { contrato: { tenantId }, estado: 'PAGADO', fechaPago: { gte: desde } },
      orderBy: { fechaPago: 'asc' },
    });
  }
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private svc: ReportsService) {}
  @Get('pagos') pagos(@TenantId() tid: string) { return this.svc.getPagosUltimos6Meses(tid); }
}

@Module({ providers: [ReportsService], controllers: [ReportsController] })
export class ReportsModule {}

// ── Alquileres activos (resumen) ──
@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}
  async findAll(tenantId: string) {
    return this.prisma.contratoAlquiler.findMany({
      where: { tenantId, estado: { in: ['ACTIVO', 'ATRASADO'] } },
      include: { propiedad: true, inquilino: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private svc: SalesService) {}
  @Get() findAll(@TenantId() tid: string) { return this.svc.findAll(tid); }
}

@Module({ providers: [SalesService], controllers: [SalesController] })
export class SalesModule {}
