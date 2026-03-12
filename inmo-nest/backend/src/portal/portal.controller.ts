import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { PortalService } from './portal.service';
import { MercadoPagoService } from './mercado-pago.service';
import { PortalLoginDto, CrearAccesoDto, CambiarPasswordDto, RegenerarPasswordDto, EnviarConsultaDto } from './portal.dto';
import { PortalGuard } from './portal.guard';
import { JwtAuthGuard, RolesGuard, Roles, Public } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { TenantId } from '../common/decorators/user.decorator';

@Controller('portal')
export class PortalController {
  constructor(
    private svc: PortalService,
    private mpSvc: MercadoPagoService,
  ) {}

  @Post('auth/login')
  login(@Body() dto: PortalLoginDto) {
    return this.svc.login(dto.email.trim(), dto.password);
  }

  @Post('auth/cambiar-password')
  @UseGuards(PortalGuard)
  cambiarPassword(
    @CurrentUser('sub') portalId: string,
    @Body() dto: CambiarPasswordDto,
  ) {
    return this.svc.cambiarPassword(portalId, dto.passwordActual, dto.passwordNueva);
  }

  @Get('mi-contrato')
  @UseGuards(PortalGuard)
  miContrato(@CurrentUser('tenantId') tenantId: string, @CurrentUser('clienteId') clienteId: string) {
    return this.svc.miContrato(tenantId, clienteId);
  }

  @Get('mis-pagos')
  @UseGuards(PortalGuard)
  misPagos(@CurrentUser('tenantId') tenantId: string, @CurrentUser('clienteId') clienteId: string) {
    return this.svc.misPagos(tenantId, clienteId);
  }

  @Get('mi-deuda')
  @UseGuards(PortalGuard)
  miDeuda(@CurrentUser('tenantId') tenantId: string, @CurrentUser('clienteId') clienteId: string) {
    return this.svc.miDeuda(tenantId, clienteId);
  }

  @Get('mis-propiedades')
  @UseGuards(PortalGuard)
  misPropiedades(@CurrentUser('tenantId') tenantId: string, @CurrentUser('clienteId') clienteId: string) {
    return this.svc.misPropiedades(tenantId, clienteId);
  }

  @Get('mis-liquidaciones')
  @UseGuards(PortalGuard)
  misLiquidaciones(@CurrentUser('tenantId') tenantId: string, @CurrentUser('clienteId') clienteId: string) {
    return this.svc.misLiquidaciones(tenantId, clienteId);
  }

  @Get('mis-facturas-servicio')
  @UseGuards(PortalGuard)
  misFacturasServicio(@CurrentUser('tenantId') tenantId: string, @CurrentUser('clienteId') clienteId: string) {
    return this.svc.misFacturasServicio(tenantId, clienteId);
  }

  @Get('mis-gastos')
  @UseGuards(PortalGuard)
  misGastos(@CurrentUser('tenantId') tenantId: string, @CurrentUser('clienteId') clienteId: string) {
    return this.svc.misGastos(tenantId, clienteId);
  }

  @Get('mis-consultas')
  @UseGuards(PortalGuard)
  misConsultas(@CurrentUser('tenantId') tenantId: string, @CurrentUser('clienteId') clienteId: string) {
    return this.svc.misConsultas(tenantId, clienteId);
  }

  @Post('enviar-consulta')
  @UseGuards(PortalGuard)
  enviarConsulta(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('clienteId') clienteId: string,
    @CurrentUser('rol') rol: string,
    @Body() dto: EnviarConsultaDto,
  ) {
    return this.svc.enviarConsulta(tenantId, clienteId, rol as 'INQUILINO' | 'PROPIETARIO', dto.mensaje);
  }

  @Post('crear-acceso')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AGENTE')
  crearAcceso(
    @TenantId() tenantId: string,
    @Body() dto: CrearAccesoDto,
    @CurrentUser('sub') usuarioId: string,
  ) {
    return this.svc.crearAcceso(tenantId, dto.clienteId, dto.password);
  }

  @Post('regenerar-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AGENTE')
  regenerarPassword(
    @TenantId() tenantId: string,
    @Body() dto: RegenerarPasswordDto,
  ) {
    return this.svc.regenerarPassword(tenantId, dto.clienteId);
  }

  /** Mercado Pago: crear preferencia para pagar un ítem de deuda (solo inquilinos) */
  @Post('pago-mp/crear-preferencia')
  @UseGuards(PortalGuard)
  crearPreferenciaMP(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('clienteId') clienteId: string,
    @Body() body: { pagoId: string },
  ) {
    return this.mpSvc.crearPreferencia(tenantId, clienteId, body.pagoId);
  }

  /** Mercado Pago: webhook (público, MP llama aquí con ?topic=payment&id=xxx) */
  @Public()
  @Post('pago-mp/webhook')
  webhookMP(@Req() req: any) {
    const topic = req.query?.topic || req.body?.type;
    const id = req.query?.id || req.body?.data?.id;
    if (topic && id) {
      return this.mpSvc.procesarWebhook(topic, String(id));
    }
    return { received: true };
  }
}
