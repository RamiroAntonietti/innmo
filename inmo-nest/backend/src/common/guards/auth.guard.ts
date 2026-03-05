import {
  Injectable, CanActivate, ExecutionContext,
  UnauthorizedException, ForbiddenException, SetMetadata
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

// ─── Decoradores ─────────────────────────────
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata('isPublic', true);

// ─── JWT Guard ────────────────────────────────
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException('Token requerido.');

    try {
      const payload = this.jwtService.verify(auth.split(' ')[1]);
      req.user = payload;
      req.tenantId = payload.tenantId;
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado.');
    }
  }
}

// ─── Roles Guard ─────────────────────────────
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (!roles) return true;

    const { user } = ctx.switchToHttp().getRequest();
    if (!roles.includes(user?.rol)) {
      throw new ForbiddenException('No tenés permisos para esta acción.');
    }
    return true;
  }
}
