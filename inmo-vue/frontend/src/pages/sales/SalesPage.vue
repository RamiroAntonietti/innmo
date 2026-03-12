<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
      <FileText :size="24" class="text-primary-500" /> Alquileres activos
    </h1>
    <p class="text-gray-500 text-sm mb-6">Resumen de contratos en curso</p>
    <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
    <div v-else-if="!contratos.length" class="text-center py-16 text-gray-400">No hay alquileres activos</div>
    <div v-else class="space-y-3">
      <router-link v-for="c in contratos" :key="c.id" :to="'/app/rentals'" class="card p-5 block hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold text-gray-900">{{ c.propiedad?.titulo }}</p>
            <p class="text-sm text-gray-500">{{ c.inquilino?.nombre }} {{ c.inquilino?.apellido }}</p>
            <p class="text-xs text-gray-400 mt-1">{{ formatFecha(c.fechaInicio) }} — {{ formatFecha(c.fechaFin) }}</p>
          </div>
          <div class="text-right">
            <p class="text-xl font-bold text-primary-600">${{ formatMonto(c.montoMensual) }}/mes</p>
            <span :class="c.estado === 'ATRASADO' ? 'badge-red' : 'badge-green'" class="text-xs">{{ c.estado }}</span>
          </div>
        </div>
      </router-link>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { FileText } from 'lucide-vue-next';
import api from '../../services/api.js';

const contratos = ref([]);
const loading = ref(true);
const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
const formatFecha = (f) => (f ? new Date(f).toLocaleDateString('es-AR') : '—');

onMounted(async () => {
  try {
    const { data } = await api.get('/sales');
    contratos.value = data.data ?? data ?? [];
  } finally {
    loading.value = false;
  }
});
</script>
