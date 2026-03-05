import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { PropertiesModule, ImagenesModule } from './properties/properties.module';
import { RentalsModule } from './rentals/rentals.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AjustesModule } from './ajustes/ajustes.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { SalesModule } from './sales/sales.module';
import { GastosModule } from './gastos/gastos.module';
import { MetricasModule } from './metricas/metricas.module';
import { TareasModule } from './tareas/tareas.module';
import { FacturasModule } from './facturas/facturas.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ClientsModule,
    PropertiesModule,
    ImagenesModule,
    RentalsModule,
    UsuariosModule,
    AjustesModule,
    DashboardModule,
    ReportsModule,
    SalesModule,
    GastosModule,
    MetricasModule,
    TareasModule,
    FacturasModule,
  ],
})
export class AppModule {}
