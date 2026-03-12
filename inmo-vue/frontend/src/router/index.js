import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';
import { usePortalAuthStore } from '../stores/portalAuth.js';

const routes = [
  { path: '/', component: () => import('../pages/auth/LandingPage.vue'), meta: { public: true } },
  { path: '/login', redirect: '/' },
  { path: '/registro', redirect: '/' },
  {
    path: '/portal',
    component: () => import('../components/layout/PortalLayout.vue'),
    meta: { portal: true },
    children: [
      { path: '', component: () => import('../pages/portal/PortalLogin.vue'), meta: { portalPublic: true } },
      { path: 'cambiar-password', component: () => import('../pages/portal/CambiarPasswordPage.vue') },
      { path: 'inquilino', component: () => import('../pages/portal/InquilinoHome.vue'), meta: { portalRol: 'INQUILINO' } },
      { path: 'propietario', component: () => import('../pages/portal/PropietarioHome.vue'), meta: { portalRol: 'PROPIETARIO' } },
    ],
  },
  {
    path: '/app',
    component: () => import('../components/layout/Layout.vue'),
    children: [
      { path: '', redirect: '/app/dashboard' },
      { path: 'dashboard', component: () => import('../pages/dashboard/DashboardPage.vue') },
      { path: 'clients', component: () => import('../pages/clients/ClientsPage.vue') },
      { path: 'properties', component: () => import('../pages/properties/PropertiesPage.vue') },
      { path: 'properties/:id', component: () => import('../pages/properties/PropertyDetailPage.vue') },
      { path: 'rentals', component: () => import('../pages/rentals/RentalsPage.vue') },
      { path: 'sales', redirect: { path: 'rentals', query: { estado: 'activos' } } },
      { path: 'payments', component: () => import('../pages/cobros/CobrosPage.vue') },
      { path: 'expenses', component: () => import('../pages/gastos/GastosPage.vue') },
      { path: 'service-invoices', component: () => import('../pages/facturas/FacturasPage.vue') },
      { path: 'issued-invoices', component: () => import('../pages/facturas-emitidas/FacturasEmitidasPage.vue') },
      { path: 'contracts', component: () => import('../pages/contratos/ContratoPDFPage.vue') },
      { path: 'presupuestos', component: () => import('../pages/presupuestos/PresupuestosPage.vue') },
      { path: 'tasks', component: () => import('../pages/tareas/TareasPage.vue') },
      { path: 'inquiries', component: () => import('../pages/consultas/ConsultasPage.vue') },
      { path: 'metrics', component: () => import('../pages/metricas/MetricasPage.vue'), meta: { roles: ['ADMIN'] } },
      { path: 'reports', component: () => import('../pages/reports/ReportsPage.vue'), meta: { roles: ['ADMIN'] } },
      { path: 'users', component: () => import('../pages/usuarios/UsuariosPage.vue'), meta: { roles: ['ADMIN'] } },
      { path: 'configuracion', component: () => import('../pages/configuracion/ConfiguracionPage.vue'), meta: { roles: ['ADMIN'] } },
      { path: 'account', component: () => import('../pages/cuenta/CuentaPage.vue'), meta: { roles: ['ADMIN'] } },
      { path: 'migration', component: () => import('../pages/migracion/MigracionPage.vue'), meta: { roles: ['ADMIN'] } },
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/app/dashboard' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  const portalAuth = usePortalAuthStore();

  // Rutas del portal
  if (to.path.startsWith('/portal')) {
    if (to.meta.portalPublic) {
      if (portalAuth.isAuthenticated) return portalAuth.primerLogin ? '/portal/cambiar-password' : (portalAuth.isInquilino ? '/portal/inquilino' : '/portal/propietario');
      return true;
    }
    if (!portalAuth.isAuthenticated) return '/portal';
    if (to.meta.portalRol && portalAuth.user?.rol !== to.meta.portalRol) {
      return portalAuth.isInquilino ? '/portal/inquilino' : '/portal/propietario';
    }
    return true;
  }

  // Rutas del panel admin
  if (!to.meta.public && !auth.isAuthenticated) return '/';
  if (to.meta.public && auth.isAuthenticated && to.path === '/') return '/app/dashboard';
  if (to.meta.roles && !to.meta.roles.includes(auth.user?.rol)) return '/app/dashboard';
  return true;
});

export default router;
