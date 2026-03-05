import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.js';

const routes = [
  { path: '/login', component: () => import('../pages/auth/LoginPage.vue'), meta: { public: true } },
  { path: '/registro', component: () => import('../pages/auth/RegisterPage.vue'), meta: { public: true } },
  {
    path: '/',
    component: () => import('../components/layout/Layout.vue'),
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', component: () => import('../pages/dashboard/DashboardPage.vue') },
      { path: 'clients', component: () => import('../pages/clients/ClientsPage.vue') },
      { path: 'properties', component: () => import('../pages/properties/PropertiesPage.vue') },
      { path: 'properties/:id', component: () => import('../pages/properties/PropertyDetailPage.vue') },
      { path: 'rentals', component: () => import('../pages/rentals/RentalsPage.vue') },
      { path: 'cobros', component: () => import('../pages/cobros/CobrosPage.vue') },
      { path: 'gastos', component: () => import('../pages/gastos/GastosPage.vue') },
      { path: 'facturas', component: () => import('../pages/facturas/FacturasPage.vue') },
      { path: 'contratos', component: () => import('../pages/contratos/ContratoPDFPage.vue') },
      { path: 'tareas', component: () => import('../pages/tareas/TareasPage.vue') },
      { path: 'metricas', component: () => import('../pages/metricas/MetricasPage.vue'), meta: { roles: ['ADMIN'] } },
      { path: 'sales', component: () => import('../pages/sales/SalesPage.vue') },
      { path: 'reports', component: () => import('../pages/reports/ReportsPage.vue'), meta: { roles: ['ADMIN'] } },
      { path: 'usuarios', component: () => import('../pages/usuarios/UsuariosPage.vue'), meta: { roles: ['ADMIN'] } },
      { path: 'migracion', component: () => import('../pages/migracion/MigracionPage.vue'), meta: { roles: ['ADMIN'] } },
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isAuthenticated) return '/login';
  if (to.meta.public && auth.isAuthenticated) return '/dashboard';
  if (to.meta.roles && !to.meta.roles.includes(auth.user?.rol)) return '/dashboard';
  return true;
});

export default router;
