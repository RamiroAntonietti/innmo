import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './clients.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '../common/guards/auth.guard';
import { TenantId } from '../common/decorators/user.decorator';
import { Module } from '@nestjs/common';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private svc: ClientsService) {}

  @Get() findAll(@TenantId() tid: string, @Query() q: any) { return this.svc.findAll(tid, q); }
  @Get(':id') findOne(@TenantId() tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }

  @Post()
  @Roles('ADMIN', 'AGENTE')
  create(@TenantId() tid: string, @Body() dto: CreateClientDto) { return this.svc.create(tid, dto); }

  @Put(':id')
  @Roles('ADMIN', 'AGENTE')
  update(@TenantId() tid: string, @Param('id') id: string, @Body() dto: UpdateClientDto) { return this.svc.update(tid, id, dto); }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@TenantId() tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }
}

@Module({ providers: [ClientsService], controllers: [ClientsController] })
export class ClientsModule {}
