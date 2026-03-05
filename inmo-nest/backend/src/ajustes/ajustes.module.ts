import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsNumber, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId } from '../common/decorators/user.decorator';

// ── IPC Service ──────────────────────────────
const IPC_SERIE_ID = '148.3_INUCLEADOS0_DICI_M_26';

@Injectable()
export class IpcService {
  async obtenerIPCMensual(mesesAtras = 24) {
    const url = `https://apis.datos.gob.ar/series/api/series/?ids=${IPC_SERIE_ID}&limit=${mesesAtras}&sort=desc&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`INDEC API error: ${res.status}`);
    const data = await res.json();
    return (data?.data || [])
      .map(([fecha, valor]: [string, number]) => ({
        fecha: fecha.substring(0, 7),
        valor: parseFloat((valor * 100).toFixed(2)),
      }))
      .filter((d: any) => d.valor !== null && !isNaN(d.valor));
  }

  async calcularIPCAcumulado(desdeFecha: string, cantMeses: number) {
    const ipcData = await this.obtenerIPCMensual(cantMeses + 6);
    const mesesBuscados: string[] = [];
    const [anio, mes] = desdeFecha.split('-').map(Number);
    for (let i = 0; i < cantMeses; i++) {
      const d = new Date(anio, mes - 1 + i, 1);
      mesesBuscados.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
    }
    const valoresEncontrados = mesesBuscados
      .map(m => ipcData.find((d: any) => d.fecha === m))
      .filter(Boolean);
    if (!valoresEncontrados.length) throw new BadRequestException('No se encontraron datos del IPC.');

    const acumulado = valoresEncontrados.reduce((acc: number, d: any) => acc * (1 + d.valor / 100), 1);
    const porcentajeAcumulado = parseFloat(((acumulado - 1) * 100).toFixed(2));
    const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return {
      porcentajeAcumulado,
      mesesUsados: valoresEncontrados,
      mesesFaltantes: mesesBuscados.filter(m => !ipcData.find((d: any) => d.fecha === m)),
      detalle: `IPC ${valoresEncontrados.map((m: any) => `${MESES[parseInt(m.fecha.split('-')[1])-1]} ${m.valor}%`).join(' + ')} = ${porcentajeAcumulado}%`,
    };
  }

  async obtenerUltimos(cantidad = 12) {
    const data = await this.obtenerIPCMensual(cantidad);
    return data.slice(0, cantidad).reverse();
  }
}

// ── DTOs ──
enum TipoAjuste { FIJO='FIJO', IPC='IPC' }

export class ConfigurarAjusteDto {
  @IsEnum(TipoAjuste) tipoAjuste: TipoAjuste;
  @IsNumber() @Min(1) @Max(24) frecuenciaAjuste: number;
  @IsNumber() @IsOptional() porcentajeAjuste?: number;
}

// ── Ajustes Service ──────────────────────────
@Injectable()
export class AjustesService {
  private logger = new Logger('AjustesService');
  constructor(private prisma: PrismaService, private ipc: IpcService) {}

  async configurar(tenantId: string, contratoId: string, dto: ConfigurarAjusteDto) {
    const contrato = await this.prisma.contratoAlquiler.findFirst({ where: { id: contratoId, tenantId } });
    if (!contrato) throw new NotFoundException('Contrato no encontrado.');
    if (dto.tipoAjuste === 'FIJO' && !dto.porcentajeAjuste) throw new BadRequestException('El porcentaje es requerido para ajuste fijo.');

    const fechaInicio = new Date(contrato.fechaInicio);
    let proximoAjuste = new Date(fechaInicio);
    const hoy = new Date();
    while (proximoAjuste <= hoy) proximoAjuste.setMonth(proximoAjuste.getMonth() + dto.frecuenciaAjuste);

    return this.prisma.contratoAlquiler.update({
      where: { id: contratoId },
      data: { tipoAjuste: dto.tipoAjuste, frecuenciaAjuste: dto.frecuenciaAjuste,
        porcentajeAjuste: dto.tipoAjuste === 'FIJO' ? dto.porcentajeAjuste : null, proximoAjuste },
    });
  }

  async quitar(tenantId: string, contratoId: string) {
    const c = await this.prisma.contratoAlquiler.findFirst({ where: { id: contratoId, tenantId } });
    if (!c) throw new NotFoundException('Contrato no encontrado.');
    return this.prisma.contratoAlquiler.update({
      where: { id: contratoId },
      data: { tipoAjuste: null, frecuenciaAjuste: null, porcentajeAjuste: null, proximoAjuste: null },
    });
  }

  async historial(tenantId: string, contratoId: string) {
    const c = await this.prisma.contratoAlquiler.findFirst({ where: { id: contratoId, tenantId } });
    if (!c) throw new NotFoundException('Contrato no encontrado.');
    return this.prisma.historialAjuste.findMany({ where: { contratoId }, orderBy: { fechaAjuste: 'desc' } });
  }

  async previsualizar(tenantId: string, contratoId: string) {
    const c = await this.prisma.contratoAlquiler.findFirst({ where: { id: contratoId, tenantId } });
    if (!c) throw new NotFoundException('Contrato no encontrado.');
    if (!c.tipoAjuste) throw new BadRequestException('Sin ajuste configurado.');
    const montoActual = parseFloat(c.montoMensual.toString());

    if (c.tipoAjuste === 'IPC') {
      const ultimo = await this.prisma.historialAjuste.findFirst({ where: { contratoId }, orderBy: { fechaAjuste: 'desc' } });
      const desde = this.formatYYYYMM(ultimo ? new Date(ultimo.fechaAjuste) : new Date(c.fechaInicio));
      const r = await this.ipc.calcularIPCAcumulado(desde, c.frecuenciaAjuste);
      return { montoActual, porcentaje: r.porcentajeAcumulado, montoNuevo: parseFloat((montoActual*(1+r.porcentajeAcumulado/100)).toFixed(2)), detalle: r.detalle, proximoAjuste: c.proximoAjuste, mesesFaltantes: r.mesesFaltantes };
    } else {
      const p = parseFloat(c.porcentajeAjuste.toString());
      return { montoActual, porcentaje: p, montoNuevo: parseFloat((montoActual*(1+p/100)).toFixed(2)), detalle: `Ajuste fijo del ${p}%`, proximoAjuste: c.proximoAjuste };
    }
  }

  async ejecutar(contrato: any) {
    const montoAnterior = parseFloat(contrato.montoMensual.toString());
    let porcentaje: number, detalle: string;

    if (contrato.tipoAjuste === 'IPC') {
      const ultimo = await this.prisma.historialAjuste.findFirst({ where: { contratoId: contrato.id }, orderBy: { fechaAjuste: 'desc' } });
      const desde = this.formatYYYYMM(ultimo ? new Date(ultimo.fechaAjuste) : new Date(contrato.fechaInicio));
      const r = await this.ipc.calcularIPCAcumulado(desde, contrato.frecuenciaAjuste);
      porcentaje = r.porcentajeAcumulado;
      detalle = r.detalle;
    } else {
      porcentaje = parseFloat(contrato.porcentajeAjuste.toString());
      detalle = `Ajuste fijo del ${porcentaje}%`;
    }

    const montoNuevo = parseFloat((montoAnterior * (1 + porcentaje / 100)).toFixed(2));
    const proxAjuste = new Date(contrato.proximoAjuste);
    proxAjuste.setMonth(proxAjuste.getMonth() + contrato.frecuenciaAjuste);

    await this.prisma.$transaction([
      this.prisma.contratoAlquiler.update({ where: { id: contrato.id }, data: { montoMensual: montoNuevo, proximoAjuste: proxAjuste } }),
      this.prisma.historialAjuste.create({ data: { contratoId: contrato.id, fechaAjuste: new Date(), montoAnterior, montoNuevo, porcentaje, tipoAjuste: contrato.tipoAjuste, detalle } }),
    ]);
    return { montoAnterior, montoNuevo, porcentaje, detalle };
  }

  async ejecutarManual(tenantId: string, contratoId: string) {
    const c = await this.prisma.contratoAlquiler.findFirst({ where: { id: contratoId, tenantId } });
    if (!c) throw new NotFoundException('Contrato no encontrado.');
    if (!c.tipoAjuste) throw new BadRequestException('Sin ajuste configurado.');
    return this.ejecutar(c);
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async procesarVencidos() {
    const contratos = await this.prisma.contratoAlquiler.findMany({
      where: { tipoAjuste: { not: null }, proximoAjuste: { lte: new Date() }, estado: 'ACTIVO' },
    });
    this.logger.log(`Procesando ${contratos.length} ajuste(s) vencido(s)...`);
    for (const c of contratos) {
      try { await this.ejecutar(c); }
      catch (e) { this.logger.error(`Error en contrato ${c.id}: ${e.message}`); }
    }
  }

  private formatYYYYMM(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
}

// ── Controller ──
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AjustesController {
  constructor(private svc: AjustesService, private ipc: IpcService) {}

  @Post('contratos/:id/ajuste') @Roles('ADMIN','AGENTE')
  configurar(@TenantId() tid: string, @Param('id') id: string, @Body() dto: ConfigurarAjusteDto) { return this.svc.configurar(tid, id, dto); }

  @Delete('contratos/:id/ajuste') @Roles('ADMIN')
  quitar(@TenantId() tid: string, @Param('id') id: string) { return this.svc.quitar(tid, id); }

  @Get('contratos/:id/ajuste/historial')
  historial(@TenantId() tid: string, @Param('id') id: string) { return this.svc.historial(tid, id); }

  @Get('contratos/:id/ajuste/preview')
  preview(@TenantId() tid: string, @Param('id') id: string) { return this.svc.previsualizar(tid, id); }

  @Post('contratos/:id/ajuste/ejecutar') @Roles('ADMIN')
  ejecutarManual(@TenantId() tid: string, @Param('id') id: string) {
    return this.svc.ejecutarManual(tid, id);
  }

  @Get('ipc')
  ipcData(@Query('cantidad') cantidad: string) { return this.ipc.obtenerUltimos(Number(cantidad) || 12); }
}

// ── Module ──
@Module({ providers: [AjustesService, IpcService], controllers: [AjustesController] })
export class AjustesModule {}