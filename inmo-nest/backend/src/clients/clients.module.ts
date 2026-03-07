import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './clients.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId, CurrentUser } from '../common/decorators/user.decorator';
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private svc: ClientsService) {}

  @Get() findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Get(':id') findOne(@TenantId() tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }

  @Post()
  @Roles('ADMIN', 'AGENTE')
  create(@TenantId() tid: string, @Body() dto: CreateClientDto, @CurrentUser('sub') uid: string) {
    return this.svc.create(tid, dto, uid);
  }

  @Put(':id')
  @Roles('ADMIN', 'AGENTE')
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateClientDto, @CurrentUser('sub') uid: string) {
    return this.svc.update(tid, id, dto, uid);
  }

  @Put(':id/desactivar')
  @Roles('ADMIN')
  desactivar(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) {
    return this.svc.desactivar(tid, id, uid);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@TenantId() tid: string, @Param('id') id: string, @CurrentUser('sub') uid: string) {
    return this.svc.remove(tid, id, uid);
  }
}

@Module({ imports: [AuditModule], providers: [ClientsService], controllers: [ClientsController] })
export class ClientsModule {}
