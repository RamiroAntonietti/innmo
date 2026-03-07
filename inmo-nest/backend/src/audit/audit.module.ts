import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId } from '../common/decorators/user.decorator';

@Global()
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AuditController {
  constructor(private svc: AuditService) {}

  @Get()
  findAll(@TenantId() tid: string, @Query() q: any) {
    return this.svc.findAll(tid, q);
  }
}

@Module({ providers: [AuditService], controllers: [AuditController], exports: [AuditService] })
export class AuditModule {}
