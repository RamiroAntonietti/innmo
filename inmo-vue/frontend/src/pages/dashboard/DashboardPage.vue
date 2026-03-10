<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p class="text-gray-500 text-sm mt-1">Bienvenido, {{ user?.nombre }}</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" v-if="stats">
      <div class="card p-5">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm text-gray-500">Clientes</p>
          <div class="p-2 bg-blue-50 rounded-lg"><Users :size="16" class="text-blue-500" /></div>
        </div>
        <p class="text-3xl font-bold text-gray-900">{{ stats.clientes }}</p>
      </div>
      <div class="card p-5">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm text-gray-500">Propiedades</p>
          <div class="p-2 bg-green-50 rounded-lg"><Building2 :size="16" class="text-green-500" /></div>
        </div>
        <p class="text-3xl font-bold text-gray-900">{{ stats.propiedades }}</p>
      </div>
      <div class="card p-5">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm text-gray-500">Contratos activos</p>
          <div class="p-2 bg-purple-50 rounded-lg"><FileText :size="16" class="text-purple-500" /></div>
        </div>
        <p class="text-3xl font-bold text-gray-900">{{ stats.contratos }}</p>
      </div>
      <div class="card p-5">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm text-gray-500">Pagos atrasados</p>
          <div class="p-2 bg-red-50 rounded-lg"><AlertCircle :size="16" class="text-red-500" /></div>
        </div>
        <p class="text-3xl font-bold text-red-600">{{ stats.pagosAtrasados }}</p>
      </div>
    </div>

    <div class="card p-6" v-if="stats">
      <p class="text-sm font-semibold text-gray-700 mb-1">Ingresos del mes</p>
      <p class="text-4xl font-bold text-green-600">${{ formatMonto(stats.ingresosMes) }}</p>
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Users, Building2, FileText, AlertCircle } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth.js';
import api from '../../services/api.js';

const { user } = useAuthStore();
const stats = ref(null);
const loading = ref(true);

const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });

onMounted(async () => {
  try {
    const { data } = await api.get('/dashboard/stats');
    stats.value = data.data || data;
  } finally {
    loading.value = false;
  }
});
</script>
