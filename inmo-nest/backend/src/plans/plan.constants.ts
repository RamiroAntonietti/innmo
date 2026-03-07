// ─── DEFINICIÓN CENTRAL DE PLANES ─────────────────────────────
// Esta es la fuente de verdad de qué módulos tiene cada plan.
// Se usa tanto en backend (guard) como puede sincronizarse al frontend.

export const PLAN_MODULES: Record<string, string[]> = {
  STARTER: [
    'clientes', 'propiedades', 'contratos', 'cobros',
    'tareas', 'contratos_pdf', 'metricas_basicas',
  ],
  PRO: [
    'clientes', 'propiedades', 'contratos', 'cobros',
    'tareas', 'contratos_pdf', 'metricas_basicas',
    'gastos', 'facturas', 'metricas_avanzadas',
    'migracion_excel', 'ventas', 'ajuste_ipc',
    'notificaciones_avanzadas',
  ],
  ENTERPRISE: [
    'clientes', 'propiedades', 'contratos', 'cobros',
    'tareas', 'contratos_pdf', 'metricas_basicas',
    'gastos', 'facturas', 'metricas_avanzadas',
    'migracion_excel', 'ventas', 'ajuste_ipc',
    'notificaciones_avanzadas',
    // Feature flags — preparados para futuro
    'multi_sucursal', 'api_integracion',
    'portal_propietario', 'portal_inquilino',
    'automatizaciones', 'reportes_avanzados',
  ],
};

export const PLAN_LIMITS: Record<string, { maxProperties: number | null; maxUsers: number | null }> = {
  STARTER:    { maxProperties: 10, maxUsers: 1 },
  PRO:        { maxProperties: null, maxUsers: 5 },
  ENTERPRISE: { maxProperties: null, maxUsers: null },
};
