spage · VUE
Copy

<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 :size="24" class="text-primary-500" /> Métricas
        </h1>
        <p class="text-gray-500 text-sm mt-1">Panel de análisis financiero</p>
      </div>
      <!-- Filtro de fechas -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <CalendarDays :size="15" class="text-gray-400" />
          <input v-model="desde" type="date" class="text-sm text-gray-700 outline-none" @change="fetchMetricas" />
          <span class="text-gray-300">—</span>
          <input v-model="hasta" type="date" class="text-sm text-gray-700 outline-none" @change="fetchMetricas" />
        </div>
        <button @click="fetchMetricas" class="btn-primary flex items-center gap-2 py-2">
          <RefreshCw :size="15" :class="loading ? 'animate-spin' : ''" /> Actualizar
        </button>
        <button @click="exportarExcel" :disabled="!metricas" class="btn-secondary flex items-center gap-2 py-2">
          <Download :size="15" /> Exportar Excel
        </button>
        <button @click="exportarExcel" :disabled="!metricas" class="btn-secondary flex items-center gap-2 py-2">
          <Download :size="15" /> Exportar
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-20 text-gray-400">Cargando métricas...</div>

    <template v-else-if="data">
      <!-- KPIs -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs text-gray-500">Total ingresos</p>
            <div class="p-1.5 bg-green-50 rounded-lg"><TrendingUp :size="14" class="text-green-500" /></div>
          </div>
          <p class="text-2xl font-bold text-green-600">${{ formatMonto(totalIngresos) }}</p>
          <p class="text-xs text-gray-400 mt-1">en el período</p>
        </div>
        <div class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs text-gray-500">Total gastos</p>
            <div class="p-1.5 bg-red-50 rounded-lg"><TrendingDown :size="14" class="text-red-500" /></div>
          </div>
          <p class="text-2xl font-bold text-red-500">${{ formatMonto(totalGastos) }}</p>
          <p class="text-xs text-gray-400 mt-1">en el período</p>
        </div>
        <div class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs text-gray-500">Resultado neto</p>
            <div class="p-1.5 bg-primary-50 rounded-lg"><DollarSign :size="14" class="text-primary-500" /></div>
          </div>
          <p class="text-2xl font-bold" :class="neto >= 0 ? 'text-primary-600' : 'text-red-600'">${{ formatMonto(neto) }}</p>
          <p class="text-xs text-gray-400 mt-1">ingresos - gastos</p>
        </div>
        <div class="card p-5">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs text-gray-500">Tasa de ocupación</p>
            <div class="p-1.5 bg-blue-50 rounded-lg"><Building2 :size="14" class="text-blue-500" /></div>
          </div>
          <p class="text-2xl font-bold text-blue-600">{{ data.ocupacion.tasaOcupacion }}%</p>
          <p class="text-xs text-gray-400 mt-1">{{ data.ocupacion.alquiladas }}/{{ data.ocupacion.total }} propiedades</p>
        </div>
      </div>

      <!-- Gráficos -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

        <!-- Ingresos por mes -->
        <div class="card p-6">
          <h2 class="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingUp :size="16" class="text-green-500" /> Ingresos por mes
          </h2>
          <div v-if="!data.ingresosPorMes.length" class="text-center py-8 text-gray-400 text-sm">Sin datos en el período</div>
          <div v-else class="space-y-3">
            <div v-for="m in data.ingresosPorMes" :key="m.key" class="flex items-center gap-3">
              <p class="text-xs text-gray-500 w-20 flex-shrink-0">{{ m.mes }}</p>
              <div class="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                <div class="h-full bg-green-400 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  :style="`width: ${maxIngresos > 0 ? (m.total / maxIngresos * 100) : 0}%`">
                </div>
              </div>
              <p class="text-xs font-semibold text-gray-700 w-24 text-right">${{ formatMonto(m.total) }}</p>
            </div>
          </div>
        </div>

        <!-- Gastos por mes -->
        <div class="card p-6">
          <h2 class="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingDown :size="16" class="text-red-500" /> Gastos por mes
          </h2>
          <div v-if="!data.gastosPorMes.length" class="text-center py-8 text-gray-400 text-sm">Sin datos en el período</div>
          <div v-else class="space-y-3">
            <div v-for="m in data.gastosPorMes" :key="m.key" class="flex items-center gap-3">
              <p class="text-xs text-gray-500 w-20 flex-shrink-0">{{ m.mes }}</p>
              <div class="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                <div class="h-full bg-red-400 rounded-full transition-all duration-500"
                  :style="`width: ${maxGastos > 0 ? (m.total / maxGastos * 100) : 0}%`">
                </div>
              </div>
              <p class="text-xs font-semibold text-gray-700 w-24 text-right">${{ formatMonto(m.total) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Ocupación detalle -->
      <div class="card p-6 mb-6">
        <h2 class="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Building2 :size="16" class="text-blue-500" /> Ocupación de propiedades
        </h2>
        <div class="flex items-center gap-8">
          <!-- Donut visual -->
          <div class="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" stroke-width="3.8" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" stroke-width="3.8"
                :stroke-dasharray="`${data.ocupacion.tasaOcupacion} ${100 - data.ocupacion.tasaOcupacion}`"
                stroke-linecap="round" />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center flex-col">
              <p class="text-xl font-bold text-gray-900">{{ data.ocupacion.tasaOcupacion }}%</p>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-6 flex-1">
            <div class="text-center">
              <p class="text-3xl font-bold text-blue-600">{{ data.ocupacion.alquiladas }}</p>
              <p class="text-xs text-gray-500 mt-1">Alquiladas</p>
            </div>
            <div class="text-center">
              <p class="text-3xl font-bold text-green-500">{{ data.ocupacion.disponibles }}</p>
              <p class="text-xs text-gray-500 mt-1">Disponibles</p>
            </div>
            <div class="text-center">
              <p class="text-3xl font-bold text-yellow-500">{{ data.ocupacion.reservadas }}</p>
              <p class="text-xs text-gray-500 mt-1">Reservadas</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagos atrasados por inquilino -->
      <div class="card overflow-hidden">
        <div class="p-5 border-b border-gray-100 flex items-center gap-2">
          <AlertCircle :size="16" class="text-red-500" />
          <h2 class="text-base font-semibold text-gray-900">Deuda por inquilino</h2>
          <span v-if="data.pagosAtrasados.length" class="badge-red ml-auto">{{ data.pagosAtrasados.length }} con deuda</span>
        </div>
        <div v-if="!data.pagosAtrasados.length" class="text-center py-10 text-gray-400 text-sm">
          No hay pagos pendientes 🎉
        </div>
        <table v-else class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr class="text-left text-xs text-gray-500">
              <th class="px-5 py-3 font-medium">Inquilino</th>
              <th class="px-5 py-3 font-medium">Contacto</th>
              <th class="px-5 py-3 font-medium">Propiedades</th>
              <th class="px-5 py-3 font-medium text-right">Total deuda</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="i in data.pagosAtrasados" :key="i.inquilino.email" class="hover:bg-gray-50">
              <td class="px-5 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-xs font-bold text-red-600">
                    {{ i.inquilino.nombre?.[0] }}{{ i.inquilino.apellido?.[0] }}
                  </div>
                  <p class="font-semibold text-gray-900">{{ i.inquilino.nombre }} {{ i.inquilino.apellido }}</p>
                </div>
              </td>
              <td class="px-5 py-4 text-gray-500 text-xs">
                <p>{{ i.inquilino.email || '—' }}</p>
                <p>{{ i.inquilino.telefono || '' }}</p>
              </td>
              <td class="px-5 py-4">
                <div class="space-y-1">
                  <p v-for="p in i.pagos" :key="p.propiedad" class="text-xs text-gray-600">
                    {{ p.propiedad }} — <span class="font-medium">${{ formatMonto(p.monto) }}</span>
                    <span :class="p.estado === 'ATRASADO' ? 'text-red-500' : 'text-yellow-600'" class="ml-1">({{ p.estado }})</span>
                  </p>
                </div>
              </td>
              <td class="px-5 py-4 text-right">
                <p class="text-lg font-bold text-red-600">${{ formatMonto(i.totalDeuda) }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  BarChart2, CalendarDays, RefreshCw, TrendingUp, TrendingDown,
  DollarSign, Building2, AlertCircle
} from 'lucide-vue-next';
import api from '../../services/api.js';

const loading = ref(false);
const data = ref(null);

const hoy = new Date();
const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];

const desde = ref(primerDiaMes);
const hasta = ref(ultimoDiaMes);

const totalIngresos = computed(() =>
  data.value?.ingresosPorMes?.reduce((s, m) => s + m.total, 0) || 0
);
const totalGastos = computed(() =>
  data.value?.gastosPorMes?.reduce((s, m) => s + m.total, 0) || 0
);
const neto = computed(() => totalIngresos.value - totalGastos.value);

const maxIngresos = computed(() =>
  Math.max(...(data.value?.ingresosPorMes?.map(m => m.total) || [0]), 1)
);
const maxGastos = computed(() =>
  Math.max(...(data.value?.gastosPorMes?.map(m => m.total) || [0]), 1)
);

const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });

const fetchMetricas = async () => {
  loading.value = true;
  try {
    const { data: res } = await api.get('/metricas', {
      params: { desde: desde.value, hasta: hasta.value },
    });
    data.value = res.data || res;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchMetricas);



const exportarExcel = async () => {
  if (!metricas.value) return;
  const { utils, writeFile } = await import('xlsx');
  const wb = { SheetNames: [], Sheets: {} };
  const addSheet = (name, data) => {
    const ws = utils.json_to_sheet(data);
    wb.SheetNames.push(name);
    wb.Sheets[name] = ws;
  };

  const ingresos = (metricas.value.ingresosPorMes || []).map(m => ({ Mes: m.mes, Ingresos: m.total }));
  if (ingresos.length) addSheet('Ingresos por mes', ingresos);

  const gastos = (metricas.value.gastosPorMes || []).map(m => ({ Mes: m.mes, Gastos: m.total }));
  if (gastos.length) addSheet('Gastos por mes', gastos);

  const ocup = metricas.value.ocupacion;
  if (ocup) addSheet('Ocupacion', [{ Total: ocup.total, Alquiladas: ocup.alquiladas, Disponibles: ocup.disponibles, Reservadas: ocup.reservadas, 'Tasa %': ocup.tasaOcupacion }]);

  const deuda = (metricas.value.pagosAtrasadosPorInquilino || []).map(d => ({ Inquilino: d.nombreCompleto || d.inquilinoId, Deuda: d.totalDeuda, Propiedades: d.propiedades }));
  if (deuda.length) addSheet('Deuda inquilinos', deuda);

  writeFile(wb, `metricas_${desde.value}_${hasta.value}.xlsx`);
};
</script>