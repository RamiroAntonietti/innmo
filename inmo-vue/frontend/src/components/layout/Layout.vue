<template>
  <div class="flex h-screen bg-gray-50 overflow-hidden">
    <aside class="w-64 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
      <div class="p-5 border-b border-gray-100">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
            <Home :size="18" class="text-white" />
          </div>
          <div>
            <p class="font-bold text-gray-900 text-sm">InmoSaaS</p>
            <p class="text-xs text-gray-400 truncate max-w-[140px]">{{ tenant?.nombre }}</p>
          </div>
        </div>
      </div>
      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="isActive(item.to) ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
        >
          <component :is="item.icon" :size="17" />
          {{ item.label }}
        </RouterLink>
      </nav>
      <div class="p-4 border-t border-gray-100">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-600">
            {{ userInitials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ user?.nombre }} {{ user?.apellido }}</p>
            <p class="text-xs text-gray-400">{{ user?.rol }}</p>
          </div>
        </div>
        <button @click="handleLogout" class="btn-secondary w-full flex items-center justify-center gap-2 text-xs py-2">
          <LogOut :size="14" /> Cerrar sesión
        </button>
      </div>
    </aside>

    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Header con campana -->
      <header class="h-14 bg-white border-b border-gray-100 flex items-center justify-end px-6 flex-shrink-0">
        <NotificationBell />
      </header>
      <main class="flex-1 overflow-y-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.js';
import NotificationBell from '../ui/NotificationBell.vue';
import {
  LayoutDashboard, Users, Building2, FileText, TrendingUp,
  BarChart2, LogOut, Home, DollarSign, FileSpreadsheet, Shield,
  Receipt, CheckSquare, FilePlus, Zap
} from 'lucide-vue-next';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const { user, tenant } = auth;

const userInitials = computed(() => {
  if (!user) return '?';
  return `${user.nombre?.[0] || ''}${user.apellido?.[0] || ''}`.toUpperCase();
});

const navItems = computed(() => [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/properties', icon: Building2, label: 'Propiedades' },
  { to: '/rentals', icon: FileText, label: 'Alquileres' },
  { to: '/cobros', icon: DollarSign, label: 'Cobros' },
  { to: '/gastos', icon: Receipt, label: 'Gastos' },
  { to: '/facturas', icon: Zap, label: 'Facturas servicios' },
  { to: '/tareas', icon: CheckSquare, label: 'Tareas' },
  { to: '/contratos', icon: FilePlus, label: 'Contratos PDF' },
  { to: '/sales', icon: TrendingUp, label: 'Ventas' },
  ...(auth.isAdmin ? [
    { to: '/metricas', icon: BarChart2, label: 'Métricas' },
    { to: '/usuarios', icon: Shield, label: 'Usuarios' },
    { to: '/migracion', icon: FileSpreadsheet, label: 'Migración Excel' },
  ] : []),
]);

const isActive = (path) => route.path === path || route.path.startsWith(path + '/');

const handleLogout = () => {
  auth.logout();
  router.push('/login');
};
</script>
