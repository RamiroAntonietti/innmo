<template>
  <div class="layout-app flex h-dvh min-h-[100dvh] sm:h-screen bg-gray-50 overflow-hidden safe-area-inset">

    <!-- Backdrop móvil/tablet -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity"
      aria-hidden="true"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar: drawer en móvil/tablet (fixed), fijo en desktop (static) -->
    <aside
      class="sidebar flex flex-col flex-shrink-0 w-64 max-w-[85vw] bg-white border-r border-gray-100 z-50 transition-transform duration-200 ease-out fixed lg:relative inset-y-0 left-0 lg:translate-x-0 lg:max-w-none"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="absolute right-0 top-4 -translate-x-12 lg:hidden">
        <button type="button" @click="sidebarOpen = false" class="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Cerrar menú">
          <X :size="20" />
        </button>
      </div>
      <!-- Logo + plan badge -->
      <div class="p-4 sm:p-5 border-b border-gray-100 pt-12 lg:pt-5">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Home :size="18" class="text-white" />
          </div>
          <div class="min-w-0">
            <p class="font-bold text-gray-900 text-sm">InmoSaaS</p>
            <p class="text-xs text-gray-400 truncate">{{ tenant?.nombre }}</p>
          </div>
        </div>
        <div class="mt-3 flex items-center justify-between gap-2">
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
            :class="{
              'bg-gray-100 text-gray-600': planStore.isStarter,
              'bg-blue-100 text-blue-700': planStore.isPro,
              'bg-purple-100 text-purple-700': planStore.isEnterprise,
            }">
            ✦ {{ planStore.plan }}
          </span>
          <span v-if="planStore.limits.maxProperties" class="text-xs text-gray-400 truncate">
            {{ planStore.limits.currentProperties }}/{{ planStore.limits.maxProperties }} prop.
          </span>
        </div>
      </div>

      <nav class="flex-1 p-3 sm:p-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        <template v-for="item in navItems" :key="item.to || item.id">
          <!-- Dropdown -->
          <div v-if="item.type === 'dropdown'" class="mb-1">
            <button
              type="button"
              @click="dropdownAbierto = dropdownAbierto === item.id ? null : item.id"
              class="w-full flex items-center justify-between gap-2 px-3 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 min-h-[44px] touch-manipulation"
            >
              <div class="flex items-center gap-3 min-w-0">
                <component :is="item.icon" :size="17" class="flex-shrink-0" />
                <span class="truncate">{{ item.label }}</span>
              </div>
              <ChevronDown v-if="dropdownAbierto === item.id" :size="16" class="flex-shrink-0 text-gray-400 rotate-180" />
              <ChevronRight v-else :size="16" class="flex-shrink-0 text-gray-400" />
            </button>
            <div v-if="dropdownAbierto === item.id" class="ml-6 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-3">
              <template v-for="child in item.children" :key="child.to">
                <RouterLink
                  v-if="child.hasAccess"
                  :to="child.to"
                  class="flex items-center gap-2 py-2.5 px-2 rounded-lg text-sm transition-colors min-h-[40px] touch-manipulation"
                  :class="isActive(child.to) ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
                  @click="sidebarOpen = false"
                >
                  <component :is="child.icon" :size="15" class="flex-shrink-0" />
                  <span class="truncate">{{ child.label }}</span>
                </RouterLink>
                <button
                  v-else
                  type="button"
                  @click="planStore.openUpgradeModal(child.planModule)"
                  class="w-full flex items-center gap-2 py-2.5 px-2 rounded-lg text-sm text-gray-300 hover:bg-gray-50 cursor-pointer min-h-[40px] touch-manipulation text-left"
                >
                  <component :is="child.icon" :size="15" class="flex-shrink-0" />
                  <span class="truncate">{{ child.label }}</span>
                  <Lock :size="11" class="flex-shrink-0 ml-auto" />
                </button>
              </template>
            </div>
          </div>
          <!-- Link simple -->
          <RouterLink v-else-if="item.hasAccess"
            :to="item.to"
            class="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors min-h-[44px] touch-manipulation"
            :class="isActive(item.to) ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:bg-gray-100'"
            @click="sidebarOpen = false">
            <component :is="item.icon" :size="17" class="flex-shrink-0" />
            <span class="truncate">{{ item.label }}</span>
          </RouterLink>
          <button v-else
            type="button"
            @click="planStore.openUpgradeModal(item.planModule)"
            class="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-gray-50 cursor-pointer transition-colors group min-h-[44px] touch-manipulation">
            <component :is="item.icon" :size="17" class="text-gray-300 flex-shrink-0" />
            <span class="flex-1 text-left truncate">{{ item.label }}</span>
            <span class="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-md font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">PRO</span>
            <Lock :size="12" class="text-gray-300 flex-shrink-0" />
          </button>
        </template>
      </nav>

      <div class="p-3 sm:p-4 border-t border-gray-100">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-600 flex-shrink-0">
            {{ userInitials }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">{{ user?.nombre }} {{ user?.apellido }}</p>
            <p class="text-xs text-gray-400">{{ user?.rol }}</p>
          </div>
        </div>
        <button type="button" @click="handleLogout" class="btn-secondary w-full flex items-center justify-center gap-2 text-xs py-3 min-h-[44px] touch-manipulation">
          <LogOut :size="14" /> Cerrar sesión
        </button>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col overflow-hidden min-w-0">
      <header class="h-14 min-h-[52px] bg-white border-b border-gray-100 flex items-center justify-between gap-3 px-3 sm:px-6 flex-shrink-0 safe-area-top">
        <button
          type="button"
          @click="sidebarOpen = true"
          class="lg:hidden p-2.5 -ml-1 rounded-xl text-gray-600 hover:bg-gray-100 active:bg-gray-200 touch-manipulation"
          aria-label="Abrir menú"
        >
          <Menu :size="22" />
        </button>
        <div class="flex-1 min-w-0" />
        <NotificationBell />
      </header>
      <main class="flex-1 overflow-y-auto overflow-x-hidden">
        <div class="app-content">
          <RouterView />
        </div>
      </main>
    </div>

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
  Receipt, CheckSquare, FilePlus, Zap, Lock, Menu, X, Settings, FileCheck, MessageCircle, ClipboardList, ChevronDown, ChevronRight
} from 'lucide-vue-next';
import { ref, watch } from 'vue';

const auth = useAuthStore();
const planStore = usePlanStore();
const route = useRoute();
const router = useRouter();
const { user, tenant } = auth;

const sidebarOpen = ref(false);
const dropdownAbierto = ref(null); // 'propiedades' | 'generar' | 'configuracion'

watch(() => route.path, (path) => {
  sidebarOpen.value = false;
  if (path.startsWith('/app/configuracion') || path.startsWith('/app/users') || path.startsWith('/app/migration')) {
    dropdownAbierto.value = 'configuracion';
  } else if (path.startsWith('/app/presupuestos') || path.startsWith('/app/contracts')) {
    dropdownAbierto.value = 'generar';
  } else if (path.startsWith('/app/properties') || path.startsWith('/app/rentals') || path.startsWith('/app/expenses') || path.startsWith('/app/service-invoices')) {
    dropdownAbierto.value = 'propiedades';
  } else {
    dropdownAbierto.value = null;
  }
}, { immediate: true });

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
    {
      type: 'dropdown',
      id: 'propiedades',
      label: 'Propiedades',
      icon: Building2,
      children: [
        { to: '/app/properties', label: 'Propiedades', icon: Building2, hasAccess: true },
        { to: '/app/rentals', label: 'Alquileres', icon: FileText, hasAccess: true },
        { to: '/app/service-invoices', label: 'Servicios por propiedad', icon: Zap, hasAccess: hm('facturas'), planModule: 'facturas' },
        { to: '/app/expenses', label: 'Gastos por propiedad', icon: Receipt, hasAccess: hm('gastos'), planModule: 'gastos' },
      ],
    },
    { to: '/app/payments',  icon: DollarSign,       label: 'Cobros',     hasAccess: true },
    { to: '/app/issued-invoices', icon: FileCheck, label: 'Facturas a clientes (AFIP)',  hasAccess: true },
    { to: '/app/tasks',    icon: CheckSquare,      label: 'Tareas',     hasAccess: true },
    { to: '/app/inquiries', icon: MessageCircle,   label: 'Consultas portal', hasAccess: true },
    {
      type: 'dropdown',
      id: 'generar',
      label: 'Generar',
      icon: FilePlus,
      children: [
        { to: '/app/presupuestos', label: 'Presupuestos', icon: ClipboardList, hasAccess: true },
        { to: '/app/contracts', label: 'Contratos PDF', icon: FilePlus, hasAccess: true },
      ],
    },
  ];

  if (isAdmin) {
    items.push(
      { to: '/app/metrics', icon: BarChart2, label: 'Métricas', hasAccess: true },
      {
        type: 'dropdown',
        id: 'configuracion',
        label: 'Configuración',
        icon: Settings,
        children: [
          { to: '/app/configuracion', label: 'Configuración del sistema', icon: Settings, hasAccess: true },
          { to: '/app/users', label: 'Usuarios', icon: Shield, hasAccess: true },
          { to: '/app/migration', label: 'Migración Excel', icon: FileSpreadsheet, hasAccess: hm('migracion_excel'), planModule: 'migracion_excel' },
        ],
      },
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
