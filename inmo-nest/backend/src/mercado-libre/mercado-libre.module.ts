/**
 * Módulo Mercado Libre - Publicar inmuebles en ML
 *
 * PREPARADO PARA INTEGRACIÓN POR UN PROGRAMADOR HUMANO
 * Ver: prisma/migrations/../INTEGRACION_MERCADOLIBRE.md
 *
 * Endpoints disponibles:
 * - GET  /mercado-libre/auth-url     → URL para iniciar OAuth (redirect al usuario)
 * - GET  /mercado-libre/oauth/callback?code=xxx  → Callback OAuth (intercambiar code por tokens)
 * - POST /mercado-libre/publicar/:propiedadId   → Publicar propiedad en ML
 * - PUT  /mercado-libre/actualizar/:propiedadId → Actualizar publicación existente
 * - DELETE /mercado-libre/despublicar/:propiedadId → Pausar/cerrar publicación
 * - GET  /mercado-libre/estado/:propiedadId     → Estado de la publicación en ML
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Controller, Get, Post, Put, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';

@Injectable()
export class MercadoLibreService {
  constructor(private prisma: PrismaService) {}

  /**
   * TODO: Implementar por el programador.
   * Genera la URL de autorización OAuth de Mercado Libre.
   * Docs: https://developers.mercadolibre.com.ar/es_ar/autenticacion-y-autorizacion
   *
   * @param tenantId - ID del tenant
   * @param redirectUri - URL de callback (ej: https://tu-dominio.com/api/mercado-libre/oauth/callback)
   * @returns URL para redirigir al usuario a ML y autorizar la app
   */
  async getAuthUrl(tenantId: string, redirectUri: string): Promise<{ url: string }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { mlAppId: true, mlClientId: true },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');
    if (!tenant.mlClientId) {
      throw new BadRequestException('Configurá Client ID de Mercado Libre en Configuración → Mercado Libre.');
    }

    // TODO: Construir URL OAuth de ML
    // Ejemplo: https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=APP_ID&redirect_uri=REDIRECT_URI
    const baseUrl = 'https://auth.mercadolibre.com.ar/authorization';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: tenant.mlClientId,
      redirect_uri: redirectUri,
    });
    return { url: `${baseUrl}?${params.toString()}` };
  }

  /**
   * TODO: Implementar por el programador.
   * Intercambia el código de autorización por access_token y refresh_token.
   * POST https://api.mercadolibre.com/oauth/token
   *
   * @param tenantId - ID del tenant
   * @param code - Código recibido en el callback
   * @param redirectUri - Misma URL usada en getAuthUrl
   */
  async exchangeCodeForTokens(
    tenantId: string,
    code: string,
    redirectUri: string,
  ): Promise<{ success: boolean }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { mlClientId: true, mlClientSecret: true },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');
    if (!tenant.mlClientId || !tenant.mlClientSecret) {
      throw new BadRequestException('Configurá Mercado Libre en Configuración.');
    }

    // TODO: Hacer POST a https://api.mercadolibre.com/oauth/token
    // Body: grant_type=authorization_code, client_id, client_secret, code, redirect_uri
    // Guardar access_token y refresh_token en tenant (PUT /tenant/mercado-libre)

    throw new Error('TODO: Implementar exchangeCodeForTokens con fetch/axios a api.mercadolibre.com/oauth/token');
  }

  /**
   * TODO: Implementar por el programador.
   * Mapea una Propiedad del sistema al formato JSON requerido por ML.
   * Docs: https://developers.mercadolibre.com.ar/es_ar/publica-inmuebles/publica-inmueble
   *
   * Campos obligatorios ML: title, category_id, price, currency_id, buying_mode,
   * listing_type_id, condition, pictures, seller_contact, location, attributes
   *
   * Categorías inmuebles: MLA401686 (departamentos), MLA401687 (casas), etc.
   */
  private mapPropiedadToMlItem(propiedad: any, tenant: any): object {
    // TODO: Implementar mapeo
    // - Propiedad.titulo -> title
    // - Propiedad.precio -> price (convertir a número entero)
    // - Propiedad.imagenes -> pictures (array de { source: url })
    // - Propiedad.direccion, ciudad -> location (address_line, zip_code, neighborhood)
    // - Propiedad.dormitorios -> ROOMS, banos -> FULL_BATHROOMS, metrosCuadrados -> COVERED_AREA
    // - Propiedad.tipoOperacion -> OPERATION (VENTA/ALQUILER)
    // - Tenant datos para seller_contact
    return {};
  }

  /**
   * TODO: Implementar por el programador.
   * Publica una propiedad en Mercado Libre.
   * POST https://api.mercadolibre.com/items
   */
  async publicar(tenantId: string, propiedadId: string): Promise<{ mlItemId: string; permalink: string }> {
    const [propiedad, tenant] = await Promise.all([
      this.prisma.propiedad.findFirst({
        where: { id: propiedadId, tenantId, deletedAt: null },
        include: { imagenes: { orderBy: { orden: 'asc' } }, propietario: true },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { mlAccessToken: true, mlClientId: true, nombre: true, telefono: true, email: true },
      }),
    ]);

    if (!propiedad) throw new NotFoundException('Propiedad no encontrada.');
    if (!tenant?.mlAccessToken) {
      throw new BadRequestException('Conectá tu cuenta de Mercado Libre en Configuración → Mercado Libre.');
    }

    const existente = await this.prisma.propiedadMercadoLibre.findUnique({
      where: { propiedadId },
    });
    if (existente) {
      throw new BadRequestException('Esta propiedad ya está publicada en Mercado Libre. Usá actualizar.');
    }

    // TODO: Construir body con mapPropiedadToMlItem(propiedad, tenant)
    // TODO: POST https://api.mercadolibre.com/items
    // Headers: Authorization: Bearer {mlAccessToken}
    // TODO: Guardar en PropiedadMercadoLibre (mlItemId, mlPermalink, mlStatus: "active")

    throw new Error('TODO: Implementar publicar con fetch/axios a api.mercadolibre.com/items');
  }

  /**
   * TODO: Implementar por el programador.
   * Actualiza una publicación existente en ML.
   * PUT https://api.mercadolibre.com/items/{item_id}
   */
  async actualizar(tenantId: string, propiedadId: string): Promise<{ success: boolean }> {
    const pub = await this.prisma.propiedadMercadoLibre.findFirst({
      where: { propiedadId, tenantId },
    });
    if (!pub) throw new NotFoundException('La propiedad no está publicada en Mercado Libre.');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { mlAccessToken: true },
    });
    if (!tenant?.mlAccessToken) throw new BadRequestException('Conectá Mercado Libre en Configuración.');

    // TODO: Obtener propiedad actualizada, mapear, PUT a api.mercadolibre.com/items/{item_id}

    throw new Error('TODO: Implementar actualizar');
  }

  /**
   * TODO: Implementar por el programador.
   * Pausa o cierra la publicación en ML.
   * PUT https://api.mercadolibre.com/items/{item_id} con status: closed o paused
   */
  async despublicar(tenantId: string, propiedadId: string): Promise<{ success: boolean }> {
    const pub = await this.prisma.propiedadMercadoLibre.findFirst({
      where: { propiedadId, tenantId },
    });
    if (!pub) throw new NotFoundException('La propiedad no está publicada en Mercado Libre.');

    // TODO: PUT status: closed o paused

    throw new Error('TODO: Implementar despublicar');
  }

  /**
   * Obtiene el estado de la publicación (desde nuestra BD).
   * Opcional: el programador puede agregar GET a ML para estado en tiempo real.
   */
  async getEstado(tenantId: string, propiedadId: string): Promise<{ mlItemId: string; status: string; permalink?: string }> {
    const pub = await this.prisma.propiedadMercadoLibre.findFirst({
      where: { propiedadId, tenantId },
    });
    if (!pub) throw new NotFoundException('La propiedad no está publicada en Mercado Libre.');

    return {
      mlItemId: pub.mlItemId,
      status: pub.mlStatus || 'unknown',
      permalink: pub.mlPermalink || undefined,
    };
  }
}

@Controller('mercado-libre')
@UseGuards(JwtAuthGuard)
export class MercadoLibreController {
  constructor(private svc: MercadoLibreService) {}

  @Get('auth-url')
  @Roles('ADMIN')
  getAuthUrl(@TenantId() tid: string, @Query('redirect_uri') redirectUri: string) {
    if (!redirectUri) throw new BadRequestException('redirect_uri es requerido.');
    return this.svc.getAuthUrl(tid, redirectUri);
  }

  @Get('oauth/callback')
  @Roles('ADMIN')
  async oauthCallback(
    @TenantId() tid: string,
    @Query('code') code: string,
    @Query('redirect_uri') redirectUri: string,
    @CurrentUser('sub') uid: string,
  ) {
    if (!code) throw new BadRequestException('code es requerido.');
    return this.svc.exchangeCodeForTokens(tid, code, redirectUri || '');
  }

  @Post('publicar/:propiedadId')
  @Roles('ADMIN', 'AGENTE')
  publicar(@TenantId() tid: string, @Param('propiedadId') propiedadId: string) {
    return this.svc.publicar(tid, propiedadId);
  }

  @Put('actualizar/:propiedadId')
  @Roles('ADMIN', 'AGENTE')
  actualizar(@TenantId() tid: string, @Param('propiedadId') propiedadId: string) {
    return this.svc.actualizar(tid, propiedadId);
  }

  @Delete('despublicar/:propiedadId')
  @Roles('ADMIN', 'AGENTE')
  despublicar(@TenantId() tid: string, @Param('propiedadId') propiedadId: string) {
    return this.svc.despublicar(tid, propiedadId);
  }

  @Get('estado/:propiedadId')
  @Roles('ADMIN', 'AGENTE')
  getEstado(@TenantId() tid: string, @Param('propiedadId') propiedadId: string) {
    return this.svc.getEstado(tid, propiedadId);
  }
}

@Module({
  imports: [],
  providers: [MercadoLibreService],
  controllers: [MercadoLibreController],
  exports: [MercadoLibreService],
})
export class MercadoLibreModule {}
