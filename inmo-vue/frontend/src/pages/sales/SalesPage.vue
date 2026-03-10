<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
      <TrendingUp :size="24" class="text-primary-500" /> Ventas
    </h1>
    <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
    <div v-else-if="!ventas.length" class="text-center py-16 text-gray-400">No hay ventas registradas</div>
    <div v-else class="space-y-3">
      <div v-for="v in ventas" :key="v.id" class="card p-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold text-gray-900">{{ v.propiedad?.titulo }}</p>
            <p class="text-sm text-gray-500">{{ v.comprador?.nombre }} {{ v.comprador?.apellido }}</p>
          </div>
          <p class="text-xl font-bold text-green-600">${{ formatMonto(v.precio) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted } from 'vue';
import { TrendingUp } from 'lucide-vue-next';
import api from '../../services/api.js';
const ventas = ref([]);
const loading = ref(true);
const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR');
onMounted(async () => {
  try { const { data } = await api.get('/sales'); ventas.value = data.data || data; }
  finally { loading.value = false; }
});
</script>
