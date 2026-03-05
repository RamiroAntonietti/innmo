import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  const tenant = await prisma.tenant.upsert({
    where: { email: 'demo@inmobiliaria.com' },
    update: {},
    create: { nombre: 'Inmobiliaria Demo', email: 'demo@inmobiliaria.com', telefono: '1140000000' },
  });

  const hash = await bcrypt.hash('Admin123!', 12);
  await prisma.usuario.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } },
    update: {},
    create: { tenantId: tenant.id, nombre: 'Admin', apellido: 'Demo', email: 'admin@demo.com', password: hash, rol: 'ADMIN' },
  });

  console.log('✅ Seed completado');
}

main().catch(console.error).finally(() => prisma.$disconnect());
