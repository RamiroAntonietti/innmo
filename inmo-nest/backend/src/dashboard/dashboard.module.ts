import { Injectable } from '@nestjs/common';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { TenantId } from '../common/decorators/user.decorator';

// ── Dashboard ──
@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(tenantId: string) {
    const [clientes, propiedades, contratos, pagosAtrasados] = await Promise.all([
      this.prisma.cliente.count({ where: { tenantId } }),
      this.prisma.propiedad.count({ where: { tenantId } }),
      this.prisma.contratoAlquiler.count({ where: { tenantId, estado: 'ACTIVO' } }),
      this.prisma.pagoAlquiler.count({ where: { contrato: { tenantId }, estado: 'ATRASADO' } }),
    ]);
    const ingresosMes = await this.prisma.pagoAlquiler.aggregate({
      where: { contrato: { tenantId }, estado: 'PAGADO', fechaPago: { gte: new Date(new Date().setDate(1)) } },
      _sum: { monto: true },
    });
    return { clientes, propiedades, contratos, pagosAtrasados, ingresosMes: ingresosMes._sum.monto || 0 };
  }

  async getNotificaciones(tenantId: string) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const en7 = new Date(hoy); en7.setDate(en7.getDate() + 7);

    const [pagosVencidos, pagosPronto, facturasVencidas, facturasProntas, tareasVencidas] = await Promise.all([
      this.prisma.pagoAlquiler.count({ where: { contrato: { tenantId }, estado: { in: ['ATRASADO'] } } }),
      this.prisma.pagoAlquiler.count({ where: { contrato: { tenantId }, estado: 'PENDIENTE' } }),
      this.prisma.facturaServicio.count({ where: { tenantId, estado: 'PENDIENTE', fechaVence: { lt: hoy } } }),
      this.prisma.facturaServicio.count({ where: { tenantId, estado: 'PENDIENTE', fechaVence: { gte: hoy, lte: en7 } } }),
      this.prisma.tarea.count({ where: { tenantId, estado: { in: ['PENDIENTE', 'EN_PROGRESO'] }, fechaVence: { lt: hoy } } }),
    ]);

    const items: any[] = [];
    if (pagosVencidos > 0) items.push({ tipo: 'PAGO_VENCIDO', mensaje: `${pagosVencidos} pago(s) atrasado(s)`, ruta: '/cobros', urgente: true });
    if (pagosPronto > 0) items.push({ tipo: 'PAGO_PROXIMO', mensaje: `${pagosPronto} pago(s) pendiente(s)`, ruta: '/cobros', urgente: false });
    if (facturasVencidas > 0) items.push({ tipo: 'FACTURA_VENCIDA', mensaje: `${facturasVencidas} factura(s) de servicio vencida(s)`, ruta: '/facturas', urgente: true });
    if (facturasProntas > 0) items.push({ tipo: 'FACTURA_PROXIMA', mensaje: `${facturasProntas} factura(s) vencen en 7 días`, ruta: '/facturas', urgente: false });
    if (tareasVencidas > 0) items.push({ tipo: 'TAREA_VENCIDA', mensaje: `${tareasVencidas} tarea(s) vencida(s)`, ruta: '/tareas', urgente: true });

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

@Module({ providers: [DashboardService], controllers: [DashboardController] })
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

// ── Sales ──
@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}
  async findAll(tenantId: string) {
    return this.prisma.contratoAlquiler.findMany({
      where: { tenantId },
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
