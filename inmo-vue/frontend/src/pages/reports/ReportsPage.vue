<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
      <BarChart2 :size="24" class="text-primary-500" /> Reportes
    </h1>
    <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
    <div v-else-if="error" class="card p-6">
      <p class="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{{ error }}</p>
      <button type="button" class="btn-secondary mt-4 text-sm" @click="cargar">Reintentar</button>
    </div>
    <div v-else class="card p-6">
      <h2 class="text-base font-semibold text-gray-900 mb-4">Pagos últimos 6 meses</h2>
      <div class="space-y-3">
        <div v-for="p in pagos" :key="p.id" class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <p class="text-sm text-gray-600">{{ formatFecha(p.fechaPago) }}</p>
          <p class="font-semibold text-gray-900">${{ formatMonto(p.monto) }}</p>
        </div>
        <div v-if="!pagos.length" class="text-center py-8 text-gray-400">No hay pagos registrados en el período.</div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { BarChart2 } from 'lucide-vue-next';
import api from '../../services/api.js';

const pagos = ref([]);
const loading = ref(true);
const error = ref('');

const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—';

const cargar = async () => {
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.get('/reports/pagos');
    pagos.value = data.data || data || [];
  } catch (e) {
    pagos.value = [];
    error.value = e.response?.data?.error || e.response?.data?.message || 'No se pudieron cargar los reportes.';
  } finally {
    loading.value = false;
  }
};

onMounted(cargar);
</script>
