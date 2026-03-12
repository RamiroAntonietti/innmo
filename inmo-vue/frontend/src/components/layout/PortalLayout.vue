<template>
  <div class="portal-layout min-h-dvh bg-gray-50">
    <header v-if="portalAuth.isAuthenticated" class="portal-header bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center">
          <Home :size="18" class="text-white" />
        </div>
        <div>
          <h1 class="font-bold text-gray-900 text-sm">Portal</h1>
          <p class="text-xs text-gray-500">{{ tenant?.nombre }}</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-sm text-gray-600">{{ user?.nombre }}</span>
        <button
          type="button"
          @click="handleLogout"
          class="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5"
        >
          <LogOut :size="16" /> Salir
        </button>
      </div>
    </header>
    <main class="portal-main p-4 max-w-4xl mx-auto">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { Home, LogOut } from 'lucide-vue-next';
import { usePortalAuthStore } from '../../stores/portalAuth.js';
import { useRouter } from 'vue-router';

const portalAuth = usePortalAuthStore();
const router = useRouter();
const { user, tenant } = portalAuth;

const handleLogout = () => {
  portalAuth.logout();
  router.push('/portal');
};
</script>
