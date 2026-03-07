import { SetMetadata, Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanService } from '../../plans/plan.service';

// Decorator para marcar módulo requerido
export const RequirePlanModule = (moduleName: string) => SetMetadata('planModule', moduleName);

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private reflector: Reflector, private planService: PlanService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleName = this.reflector.getAllAndOverride<string>('planModule', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!moduleName) return true; // Sin restricción de plan

    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;
    if (!tenantId) return true;

    // checkModule lanza ForbiddenException si no tiene acceso
    await this.planService.checkModule(tenantId, moduleName);
    return true;
  }
}
