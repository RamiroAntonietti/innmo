import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);

  constructor(private prisma: PrismaService) {}

  private getClient(accessToken: string) {
    return new MercadoPagoConfig({ accessToken });
  }

  /** Crea preferencia de Checkout Pro para un pago pendiente. Solo inquilinos. */
  async crearPreferencia(tenantId: string, clienteId: string, pagoId: string) {
    const pago = await this.prisma.pagoAlquiler.findFirst({
      where: {
        id: pagoId,
        contrato: { tenantId, inquilinoId: clienteId },
        estado: { in: ['PENDIENTE', 'ATRASADO'] },
      },
      include: {
        contrato: {
          include: {
            propiedad: { select: { titulo: true } },
            inquilino: { select: { nombre: true, apellido: true, email: true } },
          },
        },
      },
    });
    if (!pago) throw new NotFoundException('Pago no encontrado o no disponible.');

    const tenantConfig = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { mpAccessToken: true },
    });
    const accessToken = tenantConfig?.mpAccessToken || process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new BadRequestException('Mercado Pago no está configurado. Configurá el Access Token en Configuración del sistema.');
    }

    const client = this.getClient(accessToken);
    const preference = new Preference(client);

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`;

    const body = {
      items: [{
        id: pago.id,
        title: `Alquiler - ${pago.contrato.propiedad?.titulo || 'Propiedad'}`,
        description: `Pago de alquiler ${pago.codigo || pago.id}`,
        quantity: 1,
        currency_id: 'ARS',
        unit_price: Number(pago.monto),
      }],
      payer: {
        email: pago.contrato.inquilino?.email || undefined,
        name: pago.contrato.inquilino ? `${pago.contrato.inquilino.nombre} ${pago.contrato.inquilino.apellido}` : undefined,
      },
      back_urls: {
        success: `${baseUrl}/portal/inquilino?mp=success`,
        failure: `${baseUrl}/portal/inquilino?mp=failure`,
        pending: `${baseUrl}/portal/inquilino?mp=pending`,
      },
      auto_return: 'approved' as const,
      external_reference: pagoId,
      notification_url: `${apiUrl}/api/v1/portal/pago-mp/webhook`,
    };

    const result = await preference.create({ body });

    try {
      await this.prisma.pagoMercadoPago.upsert({
        where: { pagoAlquilerId: pagoId },
        create: {
          pagoAlquilerId: pagoId,
          preferenceId: result.id!,
          initPoint: result.init_point!,
          status: 'pending',
        },
        update: {
          preferenceId: result.id!,
          initPoint: result.init_point!,
          status: 'pending',
        },
      });
    } catch {
      // Tabla pagos_mercado_pago puede no existir aún
    }

    return {
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
    };
  }

  /** Webhook: MP notifica cuando hay actualización del pago. */
  async procesarWebhook(topic: string, id: string) {
    if (topic === 'payment') {
      return this.procesarPaymentNotification(id);
    }
    if (topic === 'merchant_order') {
      this.logger.log(`Merchant order ${id} - no procesado`);
    }
    return { received: true };
  }

  private async procesarPaymentNotification(paymentId: string) {
    const mpToken = process.env.MP_ACCESS_TOKEN;
    if (!mpToken) {
      this.logger.warn('MP_ACCESS_TOKEN no configurado, no se puede verificar pago');
      return { received: true };
    }

    try {
      const client = this.getClient(mpToken);
      const payment = new Payment(client);
      const mpPayment = await payment.get({ id: paymentId });

      if (mpPayment.status === 'approved') {
        const externalRef = mpPayment.external_reference;
        if (externalRef) {
          const pago = await this.prisma.pagoAlquiler.findUnique({
            where: { id: externalRef },
            include: { contrato: true },
          });
          if (pago && ['PENDIENTE', 'ATRASADO'].includes(pago.estado)) {
            await this.prisma.$transaction(async (tx) => {
              await tx.pagoAlquiler.update({
                where: { id: externalRef },
                data: {
                  estado: 'PAGADO',
                  formaPago: 'MERCADOPAGO',
                  fechaPago: new Date(),
                  montoPagado: mpPayment.transaction_amount,
                },
              });
              await tx.pagoMercadoPago.updateMany({
                where: { pagoAlquilerId: externalRef },
                data: { status: 'approved', paymentId },
              });
              // Las cuotas ya están pre-generadas al crear el contrato; no crear nuevo pago
            });
            this.logger.log(`Pago ${externalRef} marcado como PAGADO (MP ${paymentId})`);
          }
        }
      }
    } catch (err) {
      this.logger.error(`Error procesando webhook MP: ${err?.message}`, err?.stack);
    }
    return { received: true };
  }
}
