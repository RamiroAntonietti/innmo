import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_MODULES, PLAN_LIMITS } from './plan.constants';

@Injectable()
export class PlanService {
  constructor(private prisma: PrismaService) {}

  async getTenantPlan(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { plan: true },
    });
    if (!tenant) throw new ForbiddenException('Tenant no encontrado.');
    return tenant.plan;
  }

  async checkModule(tenantId: string, moduleName: string): Promise<void> {
    const plan = await this.getTenantPlan(tenantId);
    if (!plan) return;

    const allowedModules: string[] = Array.isArray(plan.enabledModules)
      ? (plan.enabledModules as unknown as string[])
      : (PLAN_MODULES[plan.name] || []);

    if (!allowedModules.includes(moduleName)) {
      const upgrade = plan.name === 'STARTER' ? 'Pro' : 'Enterprise';
      throw new ForbiddenException(
        `PLAN_UPGRADE_REQUIRED:${plan.name}:${moduleName}:Esta función está disponible a partir del plan ${upgrade}.`,
      );
    }
  }

  async checkPropertyLimit(tenantId: string): Promise<void> {
    const plan = await this.getTenantPlan(tenantId);
    if (!plan) return;

    const limits = PLAN_LIMITS[plan.name];
    if (!limits?.maxProperties) return;

    const count = await this.prisma.propiedad.count({
      where: { tenantId, deletedAt: null },
    });

    if (count >= limits.maxProperties) {
      throw new BadRequestException(
        `PLAN_LIMIT_REACHED:propiedades:${limits.maxProperties}:Tu plan ${plan.name} permite hasta ${limits.maxProperties} propiedades. Actualizá tu plan para agregar más.`,
      );
    }
  }

  async checkUserLimit(tenantId: string): Promise<void> {
    const plan = await this.getTenantPlan(tenantId);
    if (!plan) return;

    const limits = PLAN_LIMITS[plan.name];
    if (!limits?.maxUsers) return;

    const count = await this.prisma.usuario.count({
      where: { tenantId, deletedAt: null, activo: true },
    });

    if (count >= limits.maxUsers) {
      throw new BadRequestException(
        `PLAN_LIMIT_REACHED:usuarios:${limits.maxUsers}:Tu plan ${plan.name} permite hasta ${limits.maxUsers} usuario(s). Actualizá tu plan para agregar más.`,
      );
    }
  }

  async getPlanInfo(tenantId: string) {
    const plan = await this.getTenantPlan(tenantId);
    const name = plan?.name || 'STARTER';
    const limits = PLAN_LIMITS[name];
    const modules: string[] = Array.isArray(plan?.enabledModules)
      ? (plan.enabledModules as unknown as string[])
      : (PLAN_MODULES[name] || []);

    const [propCount, userCount] = await Promise.all([
      this.prisma.propiedad.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.usuario.count({ where: { tenantId, deletedAt: null, activo: true } }),
    ]);

    return {
      plan: name,
      priceMonthly: plan?.priceMonthly,
      enabledModules: modules,
      limits: {
        maxProperties: limits?.maxProperties ?? null,
        maxUsers: limits?.maxUsers ?? null,
        currentProperties: propCount,
        currentUsers: userCount,
      },
    };
  }
}
