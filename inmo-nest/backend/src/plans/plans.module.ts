import { Module, Global, Controller, Get, UseGuards } from '@nestjs/common';
import { PlanService } from './plan.service';
import { PlanGuard } from '../common/guards/plan.guard';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { TenantId } from '../common/decorators/user.decorator';

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private svc: PlanService) {}

  // El frontend llama a este endpoint al iniciar sesión
  @Get('my-plan')
  myPlan(@TenantId() tid: string) {
    return this.svc.getPlanInfo(tid);
  }
}

@Global()
@Module({
  providers: [PlanService, PlanGuard],
  controllers: [PlansController],
  exports: [PlanService, PlanGuard],
})
export class PlansModule {}
