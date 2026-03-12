import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface WelcomeInmobiliariaData {
  nombreInmobiliaria: string;
  emailAdmin: string;
  nombreAdmin: string;
}

export interface PortalAccessData {
  nombre: string;
  email: string;
  passwordTemporal: string;
  portalUrl: string;
  tipoPortal: 'inquilino' | 'propietario';
}

export interface PaymentRegisteredData {
  nombreInquilino: string;
  email: string;
  propiedad: string;
  monto: string;
  fechaPago: string;
  formaPago?: string;
}

export interface ContractExpiringData {
  nombreInquilino: string;
  email: string;
  propiedad: string;
  fechaVencimiento: string;
  diasRestantes: number;
  codigoContrato?: string;
}

export interface ConsultaRespuestaData {
  nombreCliente: string;
  nombreInmobiliaria: string;
  respuesta: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailer: MailerService) {}

  async sendWelcomeInmobiliaria(to: string, data: WelcomeInmobiliariaData): Promise<void> {
    try {
      await this.mailer.sendMail({
        to,
        subject: `¡Bienvenido a nuestro sistema, ${data.nombreInmobiliaria}!`,
        template: 'welcome-inmobiliaria',
        context: data,
      });
      this.logger.log(`Email de bienvenida enviado a ${to}`);
    } catch (err) {
      this.logger.error(`Error enviando email de bienvenida: ${err?.message}`, err?.stack);
      throw err;
    }
  }

  async sendPortalAccess(to: string, data: PortalAccessData): Promise<void> {
    try {
      const tipo = data.tipoPortal === 'inquilino' ? 'Inquilino' : 'Propietario';
      await this.mailer.sendMail({
        to,
        subject: `Acceso al portal de ${tipo} - Credenciales temporales`,
        template: 'portal-access',
        context: { ...data, tipoPortalLabel: tipo },
      });
      this.logger.log(`Email de acceso al portal enviado a ${to}`);
    } catch (err) {
      this.logger.error(`Error enviando email de acceso al portal: ${err?.message}`, err?.stack);
      throw err;
    }
  }

  async sendPaymentRegistered(to: string, data: PaymentRegisteredData): Promise<void> {
    try {
      await this.mailer.sendMail({
        to,
        subject: `Pago registrado - ${data.propiedad}`,
        template: 'payment-registered',
        context: data,
      });
      this.logger.log(`Email de pago registrado enviado a ${to}`);
    } catch (err) {
      this.logger.error(`Error enviando email de pago: ${err?.message}`, err?.stack);
      throw err;
    }
  }

  async sendContractExpiring(to: string, data: ContractExpiringData): Promise<void> {
    try {
      await this.mailer.sendMail({
        to,
        subject: `Alerta: Contrato por vencer - ${data.propiedad}`,
        template: 'contract-expiring',
        context: data,
      });
      this.logger.log(`Email de contrato por vencer enviado a ${to}`);
    } catch (err) {
      this.logger.error(`Error enviando email de contrato por vencer: ${err?.message}`, err?.stack);
      throw err;
    }
  }

  async sendConsultaRespuesta(to: string, data: ConsultaRespuestaData): Promise<void> {
    try {
      await this.mailer.sendMail({
        to,
        subject: `Respuesta a tu consulta - ${data.nombreInmobiliaria}`,
        template: 'consulta-respuesta',
        context: data,
      });
      this.logger.log(`Email de respuesta a consulta enviado a ${to}`);
    } catch (err) {
      this.logger.error(`Error enviando email de respuesta a consulta: ${err?.message}`, err?.stack);
      throw err;
    }
  }
}
