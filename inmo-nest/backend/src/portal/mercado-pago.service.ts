import {
  Injectable, NotFoundException, BadRequestException, Logger, UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
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
    } catch (err) {
      this.logger.warn(`No se pudo persistir preferencia MP para pago ${pagoId}: ${(err as Error)?.message}`);
    }

    return {
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
    };
  }

  /**
   * Valida la firma del webhook de Mercado Pago (header x-signature).
   * En producción exige MP_WEBHOOK_SECRET; en desarrollo avisa si falta.
   */
  validarFirmaWebhook(headers: Record<string, any>, query: Record<string, any>) {
    const secret = process.env.MP_WEBHOOK_SECRET?.trim();
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new UnauthorizedException('MP_WEBHOOK_SECRET no configurado.');
      }
      this.logger.warn('MP_WEBHOOK_SECRET no configurado: se omite validación de firma (solo desarrollo).');
      return;
    }

    const xSignature = String(headers['x-signature'] || headers['X-Signature'] || '');
    const xRequestId = String(headers['x-request-id'] || headers['X-Request-Id'] || '');
    const dataId = String(query['data.id'] || query.id || '');

    if (!xSignature || !xRequestId || !dataId) {
      throw new UnauthorizedException('Webhook MP sin headers/firma válidos.');
    }

    const parts = Object.fromEntries(
      xSignature.split(',').map((p) => {
        const [k, v] = p.split('=');
        return [k?.trim(), v?.trim()];
      }).filter(([k, v]) => k && v),
    );
    const ts = parts.ts;
    const v1 = parts.v1;
    if (!ts || !v1) {
      throw new UnauthorizedException('Firma de webhook MP incompleta.');
    }

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expected = createHmac('sha256', secret).update(manifest).digest('hex');

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(v1, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Firma de webhook MP inválida.');
    }
  }

  /** Webhook: MP notifica cuando hay actualización del pago. */
  async procesarWebhook(topic: string, id: string) {
    if (topic === 'payment' || topic === 'payment.updated' || topic === 'payment.created') {
      return this.procesarPaymentNotification(id);
    }
    if (topic === 'merchant_order') {
      this.logger.log(`Merchant order ${id} - no procesado`);
    }
    return { received: true };
  }

  private async fetchPaymentWithToken(paymentId: string, accessToken: string) {
    const client = this.getClient(accessToken);
    const payment = new Payment(client);
    return payment.get({ id: paymentId });
  }

  /** Resuelve el access token del tenant que originó el pago. */
  private async resolveAccessToken(paymentId: string): Promise<string | null> {
    const linked = await this.prisma.pagoMercadoPago.findFirst({
      where: { paymentId },
      include: { pagoAlquiler: { include: { contrato: { select: { tenantId: true } } } } },
    });
    if (linked?.pagoAlquiler?.contrato?.tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: linked.pagoAlquiler.contrato.tenantId },
        select: { mpAccessToken: true },
      });
      if (tenant?.mpAccessToken) return tenant.mpAccessToken;
    }

    if (process.env.MP_ACCESS_TOKEN) return process.env.MP_ACCESS_TOKEN;

    const tenants = await this.prisma.tenant.findMany({
      where: { mpAccessToken: { not: null }, activo: true },
      select: { mpAccessToken: true },
      take: 50,
    });
    for (const t of tenants) {
      if (!t.mpAccessToken) continue;
      try {
        await this.fetchPaymentWithToken(paymentId, t.mpAccessToken);
        return t.mpAccessToken;
      } catch {
        // token de otro tenant
      }
    }
    return null;
  }

  private async procesarPaymentNotification(paymentId: string) {
    const mpToken = await this.resolveAccessToken(paymentId);
    if (!mpToken) {
      this.logger.warn(`No hay Access Token MP para verificar pago ${paymentId}`);
      return { received: true };
    }

    try {
      let mpPayment = await this.fetchPaymentWithToken(paymentId, mpToken);

      // Si usamos token global y hay external_reference, revalidar con token del tenant
      const externalRef = mpPayment.external_reference;
      if (externalRef) {
        const pago = await this.prisma.pagoAlquiler.findUnique({
          where: { id: externalRef },
          include: { contrato: { select: { tenantId: true } } },
        });
        if (pago?.contrato?.tenantId) {
          const tenant = await this.prisma.tenant.findUnique({
            where: { id: pago.contrato.tenantId },
            select: { mpAccessToken: true },
          });
          if (tenant?.mpAccessToken && tenant.mpAccessToken !== mpToken) {
            mpPayment = await this.fetchPaymentWithToken(paymentId, tenant.mpAccessToken);
          }
        }
      }

      if (mpPayment.status === 'approved') {
        const ref = mpPayment.external_reference;
        if (ref) {
          const pago = await this.prisma.pagoAlquiler.findUnique({
            where: { id: ref },
            include: { contrato: true },
          });
          if (pago && ['PENDIENTE', 'ATRASADO'].includes(pago.estado)) {
            await this.prisma.$transaction(async (tx) => {
              await tx.pagoAlquiler.update({
                where: { id: ref },
                data: {
                  estado: 'PAGADO',
                  formaPago: 'MERCADOPAGO',
                  fechaPago: new Date(),
                  montoPagado: mpPayment.transaction_amount,
                },
              });
              await tx.pagoMercadoPago.updateMany({
                where: { pagoAlquilerId: ref },
                data: { status: 'approved', paymentId },
              });
            });
            this.logger.log(`Pago ${ref} marcado como PAGADO (MP ${paymentId})`);
          }
        }
      }
    } catch (err) {
      this.logger.error(`Error procesando webhook MP: ${err?.message}`, err?.stack);
    }
    return { received: true };
  }
}
