import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';

// Condiciones IVA típicas en Argentina
export const CONDICIONES_IVA = [
  'RESPONSABLE_INSCRIPTO',
  'MONOTRIBUTISTA',
  'CONSUMIDOR_FINAL',
  'EXENTO',
  'NO_RESPONSABLE',
] as const;

export class UpdateTenantFiscalDto {
  @IsString() @IsOptional() cuit?: string;

  @IsString() @IsOptional() razonSocial?: string;

  @IsString() @IsOptional()
  condicionIva?: string;

  @IsString() @IsOptional() domicilioFiscal?: string;

  @IsNumber() @IsOptional() @Min(1) @Max(9999) puntoVenta?: number;
}

export class UpdateTenantOperacionDto {
  @IsNumber() @IsOptional() @Min(0) @Max(100)
  comisionPorcentajeAlquiler?: number;
}

export class UpdateTenantGeneralDto {
  @IsString() @IsOptional() nombre?: string;
  @IsString() @IsOptional() telefono?: string;
  @IsString() @IsOptional() direccion?: string;
  @IsString() @IsOptional() sitioWeb?: string;
  @IsString() @IsOptional() logoUrl?: string;
}

export class UpdateTenantMercadoPagoDto {
  @IsString() @IsOptional() mpAccessToken?: string;
  @IsString() @IsOptional() mpPublicKey?: string;
}

export class UpdateTenantMercadoLibreDto {
  @IsString() @IsOptional() mlAppId?: string;
  @IsString() @IsOptional() mlClientId?: string;
  @IsString() @IsOptional() mlClientSecret?: string;
  /** Tokens OAuth (se obtienen tras el flujo de autorización en developers.mercadolibre.com) */
  @IsString() @IsOptional() mlAccessToken?: string;
  @IsString() @IsOptional() mlRefreshToken?: string;
}

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService, private audit: AuditService) {}

  async get(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true, nombre: true, email: true, telefono: true,
        direccion: true, sitioWeb: true, logoUrl: true,
        cuit: true, razonSocial: true, condicionIva: true,
        domicilioFiscal: true, puntoVenta: true,
        comisionPorcentajeAlquiler: true,
        mpAccessToken: true, mpPublicKey: true,
        mlAppId: true, mlClientId: true, mlClientSecret: true,
        mlAccessToken: true, mlRefreshToken: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');
    const t = { ...tenant } as any;
    if (t.mpAccessToken) {
      t.mpAccessTokenMasked = '••••••••' + t.mpAccessToken.slice(-4);
      delete t.mpAccessToken;
    }
    if (t.mlClientSecret) {
      t.mlClientSecretMasked = '••••••••' + (t.mlClientSecret.slice(-4) || '');
      delete t.mlClientSecret;
    }
    if (t.mlAccessToken) {
      t.mlAccessTokenMasked = '••••••••' + (t.mlAccessToken.slice(-4) || '');
      delete t.mlAccessToken;
    }
    if (t.mlRefreshToken) {
      t.mlRefreshTokenMasked = '••••••••' + (t.mlRefreshToken.slice(-4) || '');
      delete t.mlRefreshToken;
    }
    return t;
  }

  async updateFiscal(tenantId: string, dto: UpdateTenantFiscalDto, usuarioId?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

    const cuitNorm = dto.cuit?.replace(/-/g, '').replace(/\s/g, '').trim();
    if (cuitNorm && (cuitNorm.length !== 11 || !/^\d{11}$/.test(cuitNorm))) {
      throw new BadRequestException('El CUIT debe tener 11 dígitos numéricos.');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        cuit: cuitNorm || undefined,
        razonSocial: dto.razonSocial,
        condicionIva: dto.condicionIva,
        domicilioFiscal: dto.domicilioFiscal,
        puntoVenta: dto.puntoVenta,
      },
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'UPDATE', entidad: 'tenant',
      entidadId: tenantId, detalle: { seccion: 'fiscal' },
    });

    return updated;
  }

  async updateOperacion(tenantId: string, dto: UpdateTenantOperacionDto, usuarioId?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { comisionPorcentajeAlquiler: dto.comisionPorcentajeAlquiler },
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'UPDATE', entidad: 'tenant',
      entidadId: tenantId, detalle: { seccion: 'operacion' },
    });

    return updated;
  }

  async updateGeneral(tenantId: string, dto: UpdateTenantGeneralDto, usuarioId?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        nombre: dto.nombre,
        telefono: dto.telefono,
        direccion: dto.direccion,
        sitioWeb: dto.sitioWeb,
        logoUrl: dto.logoUrl,
      },
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'UPDATE', entidad: 'tenant',
      entidadId: tenantId, detalle: { seccion: 'general' },
    });

    return updated;
  }

  async updateMercadoPago(tenantId: string, dto: UpdateTenantMercadoPagoDto, usuarioId?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

    const data: any = {};
    if (dto.mpAccessToken !== undefined) data.mpAccessToken = dto.mpAccessToken || null;
    if (dto.mpPublicKey !== undefined) data.mpPublicKey = dto.mpPublicKey || null;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'UPDATE', entidad: 'tenant',
      entidadId: tenantId, detalle: { seccion: 'mercado_pago' },
    });

    return updated;
  }

  async updateMercadoLibre(tenantId: string, dto: UpdateTenantMercadoLibreDto, usuarioId?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');

    const data: any = {};
    if (dto.mlAppId !== undefined) data.mlAppId = dto.mlAppId || null;
    if (dto.mlClientId !== undefined) data.mlClientId = dto.mlClientId || null;
    if (dto.mlClientSecret !== undefined) data.mlClientSecret = dto.mlClientSecret || null;
    if (dto.mlAccessToken !== undefined) data.mlAccessToken = dto.mlAccessToken || null;
    if (dto.mlRefreshToken !== undefined) data.mlRefreshToken = dto.mlRefreshToken || null;

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    await this.audit.log({
      tenantId, usuarioId, accion: 'UPDATE', entidad: 'tenant',
      entidadId: tenantId, detalle: { seccion: 'mercado_libre' },
    });

    return updated;
  }
}

@Controller('tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantController {
  constructor(private svc: TenantService) {}

  @Get()
  get(@TenantId() tid: string) {
    return this.svc.get(tid);
  }

  @Put('fiscal')
  @Roles('ADMIN')
  updateFiscal(@TenantId() tid: string, @Body() dto: UpdateTenantFiscalDto, @CurrentUser('sub') uid: string) {
    return this.svc.updateFiscal(tid, dto, uid);
  }

  @Put('operacion')
  @Roles('ADMIN')
  updateOperacion(@TenantId() tid: string, @Body() dto: UpdateTenantOperacionDto, @CurrentUser('sub') uid: string) {
    return this.svc.updateOperacion(tid, dto, uid);
  }

  @Put('general')
  @Roles('ADMIN')
  updateGeneral(@TenantId() tid: string, @Body() dto: UpdateTenantGeneralDto, @CurrentUser('sub') uid: string) {
    return this.svc.updateGeneral(tid, dto, uid);
  }

  @Put('mercado-pago')
  @Roles('ADMIN')
  updateMercadoPago(@TenantId() tid: string, @Body() dto: UpdateTenantMercadoPagoDto, @CurrentUser('sub') uid: string) {
    return this.svc.updateMercadoPago(tid, dto, uid);
  }

  @Put('mercado-libre')
  @Roles('ADMIN')
  updateMercadoLibre(@TenantId() tid: string, @Body() dto: UpdateTenantMercadoLibreDto, @CurrentUser('sub') uid: string) {
    return this.svc.updateMercadoLibre(tid, dto, uid);
  }
}

@Module({ imports: [AuditModule], providers: [TenantService], controllers: [TenantController] })
export class TenantModule {}
