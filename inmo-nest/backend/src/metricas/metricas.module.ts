import { Injectable } from '@nestjs/common';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId } from '../common/decorators/user.decorator';

@Injectable()
export class MetricasService {
  constructor(private prisma: PrismaService) {}

  async getMetricas(tenantId: string, desde: Date, hasta: Date) {
    const [ingresosPorMes, gastosPorMes, ocupacion, pagosAtrasados] = await Promise.all([
      this.getIngresosPorMes(tenantId, desde, hasta),
      this.getGastosPorMes(tenantId, desde, hasta),
      this.getOcupacion(tenantId),
      this.getPagosAtrasados(tenantId),
    ]);
    return { ingresosPorMes, gastosPorMes, ocupacion, pagosAtrasados };
  }

  private async getIngresosPorMes(tenantId: string, desde: Date, hasta: Date) {
    const pagos = await this.prisma.pagoAlquiler.findMany({
      where: { contrato: { tenantId }, estado: 'PAGADO', fechaPago: { gte: desde, lte: hasta } },
      select: { fechaPago: true, monto: true },
    });
    const map: Record<string, number> = {};
    pagos.forEach(p => {
      const key = `${p.fechaPago.getFullYear()}-${String(p.fechaPago.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + Number(p.monto);
    });
    return this.rellenarMeses(desde, hasta, map);
  }

  private async getGastosPorMes(tenantId: string, desde: Date, hasta: Date) {
    const gastos = await this.prisma.gastoPropiedad.findMany({
      where: { tenantId, fecha: { gte: desde, lte: hasta } },
      select: { fecha: true, monto: true },
    });
    const map: Record<string, number> = {};
    gastos.forEach(g => {
      const key = `${g.fecha.getFullYear()}-${String(g.fecha.getMonth() + 1).padStart(2, '0')}`;
      map[key] = (map[key] || 0) + Number(g.monto);
    });
    return this.rellenarMeses(desde, hasta, map);
  }

  private rellenarMeses(desde: Date, hasta: Date, map: Record<string, number>) {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const resultado = [];
    const cur = new Date(desde.getFullYear(), desde.getMonth(), 1);
    const fin = new Date(hasta.getFullYear(), hasta.getMonth(), 1);
    while (cur <= fin) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      resultado.push({ key, mes: `${meses[cur.getMonth()]} ${cur.getFullYear()}`, total: map[key] || 0 });
      cur.setMonth(cur.getMonth() + 1);
    }
    return resultado;
  }

  private async getOcupacion(tenantId: string) {
    const [total, alquiladas, disponibles, reservadas] = await Promise.all([
      this.prisma.propiedad.count({ where: { tenantId, tipoOperacion: 'ALQUILER' } }),
      this.prisma.propiedad.count({ where: { tenantId, tipoOperacion: 'ALQUILER', estado: 'ALQUILADO' } }),
      this.prisma.propiedad.count({ where: { tenantId, tipoOperacion: 'ALQUILER', estado: 'DISPONIBLE' } }),
      this.prisma.propiedad.count({ where: { tenantId, tipoOperacion: 'ALQUILER', estado: 'RESERVADO' } }),
    ]);
    const tasaOcupacion = total > 0 ? Math.round((alquiladas / total) * 100) : 0;
    return { total, alquiladas, disponibles, reservadas, tasaOcupacion };
  }

  private async getPagosAtrasados(tenantId: string) {
    const pagos = await this.prisma.pagoAlquiler.findMany({
      where: { contrato: { tenantId }, estado: { in: ['PENDIENTE', 'ATRASADO'] } },
      include: {
        contrato: {
          include: {
            inquilino: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } },
            propiedad: { select: { titulo: true } },
          },
        },
      },
    });
    const map: Record<string, any> = {};
    pagos.forEach(p => {
      const inq = p.contrato.inquilino;
      if (!map[inq.id]) map[inq.id] = { inquilino: inq, pagos: [], totalDeuda: 0 };
      map[inq.id].pagos.push({ propiedad: p.contrato.propiedad.titulo, monto: Number(p.monto), estado: p.estado });
      map[inq.id].totalDeuda += Number(p.monto);
    });
    return Object.values(map).sort((a: any, b: any) => b.totalDeuda - a.totalDeuda);
  }
}

@Controller('metricas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MetricasController {
  constructor(private svc: MetricasService) {}

  @Get()
  getMetricas(@TenantId() tid: string, @Query('desde') desde: string, @Query('hasta') hasta: string) {
    const desdeDate = desde ? new Date(desde) : new Date(new Date().setDate(1));
    const hastaDate = hasta ? new Date(hasta) : new Date();
    hastaDate.setHours(23, 59, 59, 999);
    return this.svc.getMetricas(tid, desdeDate, hastaDate);
  }
}

@Module({ providers: [MetricasService], controllers: [MetricasController] })
export class MetricasModule {}
