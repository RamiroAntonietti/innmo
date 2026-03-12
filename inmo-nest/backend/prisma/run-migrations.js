/**
 * Ejecuta las migraciones SQL manuales en orden.
 * Uso: node prisma/run-migrations.js
 * Requiere: DATABASE_URL en .env
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const migrationsDir = path.join(__dirname, 'migrations');
const order = [
  'add_codigo_column.sql',
  'add_fiscal_data.sql',
  'add_gastos_propiedad.sql',
  'add_codigo_gastos_propiedad.sql',
  'add_portal_acceso.sql',
  'add_consultas_portal.sql',
  'add_respuesta_consultas.sql',
  'add_mercado_pago.sql',
  'add_fecha_vence_pago_alquiler.sql',
  'add_deposito_contrato.sql',
  'add_comision_alquiler_tenant.sql',
  'add_estado_inactivo_cliente.sql',
  'preparacion_facturacion_electronica.sql',
  'add_inventario_amueblada.sql',
  'add_presupuestos.sql',
  'add_tenant_config.sql',
  'add_mercado_libre_integracion.sql',
  'rename_banos_column.sql',  // al final: opcional, solo si columna "baños" existe
];

let ok = 0, skip = 0, fail = 0;
console.log('Ejecutando migraciones manuales...\n');
for (const file of order) {
  const filePath = path.join(migrationsDir, file);
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Omitido (no existe): ${file}`);
    skip++;
    continue;
  }
  try {
    execSync(`npx prisma db execute --file "${filePath}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log(`✅ ${file}\n`);
    ok++;
  } catch (e) {
    console.error(`❌ Error en ${file}:`, e.message);
    console.log('   Continuando con la siguiente...\n');
    fail++;
  }
}
console.log('═══════════════════════════════════════');
console.log('  MIGRACIONES FINALIZADAS');
console.log(`  ✅ Ejecutadas: ${ok}  ⏭️ Omitidas: ${skip}  ❌ Errores: ${fail}`);
console.log('═══════════════════════════════════════');
if (fail > 0) {
  console.log('\nAlgunas migraciones fallaron (puede ser normal si ya estaban aplicadas).');
}
console.log('Ejecutá "npx prisma generate" si modificaste el schema.\n');
