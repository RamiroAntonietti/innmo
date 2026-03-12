import {
  Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

const PORTAL_ROLES = ['INQUILINO', 'PROPIETARIO'];

@Injectable()
export class PortalGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Token requerido.');

    try {
      const secret = process.env.JWT_PORTAL_SECRET || process.env.JWT_SECRET || 'portal-secret';
      const payload = this.jwtService.verify(auth.split(' ')[1], { secret });
      if (!payload.portal) throw new ForbiddenException('Token no válido para el portal.');
      if (!PORTAL_ROLES.includes(payload.rol)) throw new ForbiddenException('Rol no autorizado para el portal.');

      req.user = payload;
      req.tenantId = payload.tenantId;
      req.portalUser = payload;
      return true;
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      throw new UnauthorizedException('Token inválido o expirado.');
    }
  }
}
