<template>
  <div class="flex h-screen bg-gray-50 overflow-hidden">

    <!-- Sidebar -->
    <aside class="w-64 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">

      <!-- Logo + plan badge -->
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
        <!-- Badge del plan -->
        <div class="mt-3 flex items-center justify-between">
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full"
            :class="{
              'bg-gray-100 text-gray-600': planStore.isStarter,
              'bg-blue-100 text-blue-700': planStore.isPro,
              'bg-purple-100 text-purple-700': planStore.isEnterprise,
            }">
            ✦ {{ planStore.plan }}
          </span>
          <!-- Barra de propiedades si tiene límite -->
          <span v-if="planStore.limits.maxProperties" class="text-xs text-gray-400">
            {{ planStore.limits.currentProperties }}/{{ planStore.limits.maxProperties }} prop.
          </span>
        </div>
      </div>

      <!-- Nav items -->
      <nav class="flex-1 p-4 space-y-0.5 overflow-y-auto">
        <template v-for="item in navItems" :key="item.to">
          <!-- Item con acceso -->
          <RouterLink v-if="item.hasAccess"
            :to="item.to"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            :class="isActive(item.to) ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'">
            <component :is="item.icon" :size="17" />
            {{ item.label }}
          </RouterLink>
          <!-- Item bloqueado por plan -->
          <button v-else
            @click="planStore.openUpgradeModal(item.planModule)"
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-50 cursor-pointer transition-colors group">
            <component :is="item.icon" :size="17" class="text-gray-300" />
            <span class="flex-1 text-left">{{ item.label }}</span>
            <span class="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-md font-semibold opacity-0 group-hover:opacity-100 transition-opacity">PRO</span>
            <Lock :size="12" class="text-gray-300 flex-shrink-0" />
          </button>
        </template>
      </nav>

      <!-- User footer -->
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

    <!-- Main -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <header class="h-14 bg-white border-b border-gray-100 flex items-center justify-end px-6 flex-shrink-0">
        <NotificationBell />
      </header>
      <main class="flex-1 overflow-y-auto">
        <RouterView />
      </main>
    </div>

    <!-- Modal de upgrade global -->
    <UpgradeModal />
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.js';
import { usePlanStore } from '../../stores/plan.js';
import NotificationBell from '../ui/NotificationBell.vue';
import UpgradeModal from '../common/UpgradeModal.vue';
import {
  LayoutDashboard, Users, Building2, FileText, TrendingUp,
  BarChart2, LogOut, Home, DollarSign, FileSpreadsheet, Shield,
  Receipt, CheckSquare, FilePlus, Zap, Lock
} from 'lucide-vue-next';

const auth = useAuthStore();
const planStore = usePlanStore();
const route = useRoute();
const router = useRouter();
const { user, tenant } = auth;

onMounted(async () => {
  if (!planStore.loaded) await planStore.fetchPlan();
});

const userInitials = computed(() => {
  if (!user) return '?';
  return `${user.nombre?.[0] || ''}${user.apellido?.[0] || ''}`.toUpperCase();
});

const navItems = computed(() => {
  const hm = planStore.hasModule;
  const isAdmin = auth.isAdmin;

  const items = [
    { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard', hasAccess: true },
    { to: '/app/clients',   icon: Users,           label: 'Clientes',   hasAccess: true },
    { to: '/app/properties',icon: Building2,        label: 'Propiedades',hasAccess: true },
    { to: '/app/rentals',   icon: FileText,         label: 'Alquileres', hasAccess: true },
    { to: '/app/cobros',    icon: DollarSign,       label: 'Cobros',     hasAccess: true },
    { to: '/app/gastos',    icon: Receipt,          label: 'Gastos',     hasAccess: hm('gastos'),   planModule: 'gastos' },
    { to: '/app/facturas',  icon: Zap,              label: 'Facturas',   hasAccess: hm('facturas'), planModule: 'facturas' },
    { to: '/app/tareas',    icon: CheckSquare,      label: 'Tareas',     hasAccess: true },
    { to: '/app/contratos', icon: FilePlus,         label: 'Contratos PDF', hasAccess: true },
    { to: '/app/sales',     icon: TrendingUp,       label: 'Ventas',     hasAccess: hm('ventas'),   planModule: 'ventas' },
  ];

  if (isAdmin) {
    items.push(
      { to: '/app/metricas', icon: BarChart2,       label: 'Métricas',   hasAccess: true },
      { to: '/app/usuarios', icon: Shield,           label: 'Usuarios',   hasAccess: true },
      { to: '/app/migracion',icon: FileSpreadsheet, label: 'Migración Excel', hasAccess: hm('migracion_excel'), planModule: 'migracion_excel' },
    );
  }

  return items;
});

const isActive = (path) => route.path === path || route.path.startsWith(path + '/');

const handleLogout = () => {
  auth.logout();
  planStore.reset();
  router.push('/');
};
</script>
