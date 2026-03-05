<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
      <DollarSign :size="24" class="text-primary-500" /> Cobros pendientes
    </h1>
    <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
    <div v-else class="space-y-3">
      <div v-for="p in pagos" :key="p.id" class="card p-5 flex items-center justify-between">
        <div>
          <p class="font-semibold text-gray-900">{{ p.contrato?.inquilino?.nombre }} {{ p.contrato?.inquilino?.apellido }}</p>
          <p class="text-sm text-gray-500">{{ p.contrato?.propiedad?.titulo }}</p>
          <p class="text-xs text-gray-400 mt-1">Vence: {{ formatFecha(p.fechaVencimiento) }}
            <span v-if="p.diasAtraso > 0" class="text-red-500 font-medium ml-1">({{ p.diasAtraso }} días atraso)</span>
          </p>
        </div>
        <div class="text-right">
          <p class="text-xl font-bold text-primary-600">${{ formatMonto(p.monto) }}</p>
          <span :class="p.diasAtraso > 0 ? 'badge-red' : 'badge-yellow'">{{ p.estado }}</span>
        </div>
      </div>
      <div v-if="!pagos.length" class="text-center py-12 text-gray-400">No hay cobros pendientes</div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { DollarSign } from 'lucide-vue-next';
import api from '../../services/api.js';
const pagos = ref([]);
const loading = ref(true);
const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—';
onMounted(async () => {
  try { const { data } = await api.get('/rentals/payments/pending'); pagos.value = data.data || data; }
  finally { loading.value = false; }
});
</script>
