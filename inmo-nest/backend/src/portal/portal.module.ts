import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { PortalGuard } from './portal.guard';
import { MercadoPagoService } from './mercado-pago.service';

@Module({
  imports: [
    JwtModule.register({}), // PortalGuard/PortalService usan JWT_PORTAL_SECRET explícitamente
  ],
  controllers: [PortalController],
  providers: [PortalService, PortalGuard, MercadoPagoService],
  exports: [PortalService],
})
export class PortalModule {}
