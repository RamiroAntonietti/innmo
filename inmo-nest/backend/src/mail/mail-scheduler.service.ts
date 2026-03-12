import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

const DIAS_ALERTA = 30;

@Injectable()
export class MailSchedulerService {
  private readonly logger = new Logger(MailSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  /** Ejecuta diariamente a las 8:00 AM - alerta de contratos por vencer en 30 días */
  @Cron('0 8 * * *', { timeZone: 'America/Argentina/Buenos_Aires' })
  async handleContractExpiringAlerts() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + DIAS_ALERTA);
    limite.setHours(23, 59, 59, 999);

    const contratos = await this.prisma.contratoAlquiler.findMany({
      where: {
        estado: 'ACTIVO',
        fechaFin: { gte: hoy, lte: limite },
      },
      include: {
        inquilino: { select: { nombre: true, apellido: true, email: true } },
        propiedad: { select: { titulo: true } },
      },
    });

    this.logger.log(`Enviando ${contratos.length} alerta(s) de contrato por vencer`);

    for (const c of contratos) {
      const email = c.inquilino?.email;
      if (!email) continue;

      const fechaVenc = new Date(c.fechaFin);
      const diasRestantes = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

      try {
        await this.mail.sendContractExpiring(email, {
          nombreInquilino: `${c.inquilino.nombre} ${c.inquilino.apellido}`,
          email,
          propiedad: c.propiedad?.titulo || 'Propiedad',
          fechaVencimiento: fechaVenc.toLocaleDateString('es-AR'),
          diasRestantes,
          codigoContrato: c.codigo || undefined,
        });
      } catch (err) {
        this.logger.error(`Error enviando alerta contrato ${c.id}: ${err?.message}`);
      }
    }
  }
}
