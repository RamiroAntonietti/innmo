<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 :size="24" class="text-primary-500" /> Métricas
        </h1>
        <p class="text-gray-500 text-sm mt-1">Panel de análisis financiero</p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Período rápido -->
        <div class="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button v-for="p in periodos" :key="p.key" @click="aplicarPeriodo(p.key)"
            :class="periodoActivo === p.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'"
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all">
            {{ p.label }}
          </button>
        </div>
        <!-- Período custom -->
        <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <CalendarDays :size="15" class="text-gray-400" />
          <input v-model="desde" type="date" class="text-sm text-gray-700 outline-none" @change="onFechaChange" />
          <span class="text-gray-300">—</span>
          <input v-model="hasta" type="date" class="text-sm text-gray-700 outline-none" @change="onFechaChange" />
        </div>
        <button @click="fetchMetricas" class="btn-primary flex items-center gap-2 py-2">
          <RefreshCw :size="15" :class="loading ? 'animate-spin' : ''" /> Actualizar
        </button>
        <button @click="modalExport = true" :disabled="!data" class="btn-secondary flex items-center gap-2 py-2">
          <Download :size="15" /> Exportar
        </button>
      </div>
    </div>

    <!-- Filtros de vista -->
    <div class="flex gap-2 mb-6 flex-wrap">
      <button v-for="f in filtros" :key="f.key" @click="toggleFiltro(f.key)"
        :class="filtrosActivos.includes(f.key) ? 'bg-primary-500 text-white' : 'bg-white text-gray-600 border border-gray-200'"
        class="px-3 py-1.5 rounded-xl text-xs font-medium transition-all hover:shadow-sm">
        {{ f.emoji }} {{ f.label }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-20 text-gray-400">Cargando métricas...</div>

    <template v-else-if="data">
      <!-- KPIs -->
      <div v-if="filtrosActivos.includes('kpis')" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      <!-- Gráficos ingresos/gastos -->
      <div v-if="filtrosActivos.includes('ingresos') || filtrosActivos.includes('gastos')"
        class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div v-if="filtrosActivos.includes('ingresos')" class="card p-6">
          <h2 class="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingUp :size="16" class="text-green-500" /> Ingresos por mes
          </h2>
          <div v-if="!data.ingresosPorMes.length" class="text-center py-8 text-gray-400 text-sm">Sin datos en el período</div>
          <div v-else class="space-y-3">
            <div v-for="m in data.ingresosPorMes" :key="m.key" class="flex items-center gap-3">
              <p class="text-xs text-gray-500 w-20 flex-shrink-0">{{ m.mes }}</p>
              <div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                <div class="h-full bg-green-400 rounded-full transition-all duration-500"
                  :style="`width: ${maxIngresos > 0 ? (m.total / maxIngresos * 100) : 0}%`" />
              </div>
              <p class="text-xs font-semibold text-gray-700 w-24 text-right">${{ formatMonto(m.total) }}</p>
            </div>
          </div>
        </div>
        <div v-if="filtrosActivos.includes('gastos')" class="card p-6">
          <h2 class="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <TrendingDown :size="16" class="text-red-500" /> Gastos por mes
          </h2>
          <div v-if="!data.gastosPorMes.length" class="text-center py-8 text-gray-400 text-sm">Sin datos en el período</div>
          <div v-else class="space-y-3">
            <div v-for="m in data.gastosPorMes" :key="m.key" class="flex items-center gap-3">
              <p class="text-xs text-gray-500 w-20 flex-shrink-0">{{ m.mes }}</p>
              <div class="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                <div class="h-full bg-red-400 rounded-full transition-all duration-500"
                  :style="`width: ${maxGastos > 0 ? (m.total / maxGastos * 100) : 0}%`" />
              </div>
              <p class="text-xs font-semibold text-gray-700 w-24 text-right">${{ formatMonto(m.total) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Ocupación -->
      <div v-if="filtrosActivos.includes('ocupacion')" class="card p-6 mb-6">
        <h2 class="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <Building2 :size="16" class="text-blue-500" /> Ocupación de propiedades
        </h2>
        <div class="flex items-center gap-8">
          <div class="relative w-32 h-32 flex-shrink-0">
            <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" stroke-width="3.8" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" stroke-width="3.8"
                :stroke-dasharray="`${data.ocupacion.tasaOcupacion} ${100 - data.ocupacion.tasaOcupacion}`"
                stroke-linecap="round" />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
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

      <!-- Deuda inquilinos -->
      <div v-if="filtrosActivos.includes('deuda')" class="card overflow-hidden">
        <div class="p-5 border-b border-gray-100 flex items-center gap-2">
          <AlertCircle :size="16" class="text-red-500" />
          <h2 class="text-base font-semibold text-gray-900">Deuda por inquilino</h2>
          <span v-if="data.pagosAtrasados.length" class="badge-red ml-auto">{{ data.pagosAtrasados.length }} con deuda</span>
        </div>
        <div v-if="!data.pagosAtrasados.length" class="text-center py-10 text-gray-400 text-sm">No hay pagos pendientes 🎉</div>
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
            <tr v-for="i in data.pagosAtrasados" :key="i.inquilino.id" class="hover:bg-gray-50">
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

    <!-- Modal exportar -->
    <div v-if="modalExport" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold flex items-center gap-2"><Download :size="18" /> Exportar a Excel</h2>
          <button @click="modalExport = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>

        <!-- Período de exportación -->
        <div class="mb-5">
          <label class="label">Período a exportar</label>
          <div class="flex gap-2 mb-3 flex-wrap">
            <button v-for="p in periodos" :key="p.key" @click="aplicarPeriodoExport(p.key)"
              :class="periodoExport === p.key ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all">
              {{ p.label }}
            </button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Desde</label>
              <input v-model="exportDesde" type="date" class="input" />
            </div>
            <div>
              <label class="label">Hasta</label>
              <input v-model="exportHasta" type="date" class="input" />
            </div>
          </div>
        </div>

        <!-- Qué incluir -->
        <div class="mb-5">
          <label class="label">Hojas a incluir</label>
          <div class="space-y-2">
            <label v-for="h in hojasExport" :key="h.key"
              class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" v-model="h.activa" class="rounded" />
              <span class="text-lg">{{ h.emoji }}</span>
              <div>
                <p class="text-sm font-medium text-gray-900">{{ h.label }}</p>
                <p class="text-xs text-gray-400">{{ h.desc }}</p>
              </div>
            </label>
          </div>
        </div>

        <div class="flex gap-3">
          <button @click="modalExport = false" class="btn-secondary flex-1">Cancelar</button>
          <button @click="exportarExcel" :disabled="exportando || !hojasExport.some(h => h.activa)"
            class="btn-primary flex-1 flex items-center justify-center gap-2">
            <Download :size="15" />
            {{ exportando ? 'Generando...' : 'Descargar Excel' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import {
  BarChart2, CalendarDays, RefreshCw, TrendingUp, TrendingDown,
  DollarSign, Building2, AlertCircle, Download, X
} from 'lucide-vue-next';
import api from '../../services/api.js';

const loading = ref(false);
const exportando = ref(false);
const modalExport = ref(false);
const data = ref(null);
const periodoActivo = ref('mes');

const hoy = new Date();
const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];

const desde = ref(primerDiaMes);
const hasta = ref(ultimoDiaMes);
const exportDesde = ref(primerDiaMes);
const exportHasta = ref(ultimoDiaMes);
const periodoExport = ref('mes');

const periodos = [
  { key: 'mes', label: 'Este mes' },
  { key: 'trimestre', label: 'Trimestre' },
  { key: 'anio', label: 'Este año' },
  { key: 'custom', label: 'Personalizado' },
];

const filtros = [
  { key: 'kpis', label: 'KPIs', emoji: '📊' },
  { key: 'ingresos', label: 'Ingresos', emoji: '📈' },
  { key: 'gastos', label: 'Gastos', emoji: '📉' },
  { key: 'ocupacion', label: 'Ocupación', emoji: '🏠' },
  { key: 'deuda', label: 'Deuda', emoji: '⚠️' },
];
const filtrosActivos = ref(['kpis', 'ingresos', 'gastos', 'ocupacion', 'deuda']);

const hojasExport = reactive([
  { key: 'ingresos', label: 'Ingresos por mes', emoji: '📈', desc: 'Total cobrado mes a mes', activa: true },
  { key: 'gastos', label: 'Gastos por mes', emoji: '📉', desc: 'Total gastado mes a mes', activa: true },
  { key: 'ocupacion', label: 'Ocupación', emoji: '🏠', desc: 'Estado actual de propiedades', activa: true },
  { key: 'deuda', label: 'Deuda inquilinos', emoji: '⚠️', desc: 'Pagos pendientes y atrasados', activa: true },
]);

const totalIngresos = computed(() => data.value?.ingresosPorMes?.reduce((s, m) => s + m.total, 0) || 0);
const totalGastos = computed(() => data.value?.gastosPorMes?.reduce((s, m) => s + m.total, 0) || 0);
const neto = computed(() => totalIngresos.value - totalGastos.value);
const maxIngresos = computed(() => Math.max(...(data.value?.ingresosPorMes?.map(m => m.total) || [0]), 1));
const maxGastos = computed(() => Math.max(...(data.value?.gastosPorMes?.map(m => m.total) || [0]), 1));

const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });

const getPeriodoDates = (key) => {
  const h = new Date();
  if (key === 'mes') return [
    new Date(h.getFullYear(), h.getMonth(), 1).toISOString().split('T')[0],
    new Date(h.getFullYear(), h.getMonth() + 1, 0).toISOString().split('T')[0],
  ];
  if (key === 'trimestre') return [
    new Date(h.getFullYear(), h.getMonth() - 2, 1).toISOString().split('T')[0],
    new Date(h.getFullYear(), h.getMonth() + 1, 0).toISOString().split('T')[0],
  ];
  if (key === 'anio') return [
    new Date(h.getFullYear(), 0, 1).toISOString().split('T')[0],
    new Date(h.getFullYear(), 11, 31).toISOString().split('T')[0],
  ];
  return null;
};

const aplicarPeriodo = (key) => {
  periodoActivo.value = key;
  const dates = getPeriodoDates(key);
  if (dates) { desde.value = dates[0]; hasta.value = dates[1]; fetchMetricas(); }
};

const aplicarPeriodoExport = (key) => {
  periodoExport.value = key;
  const dates = getPeriodoDates(key);
  if (dates) { exportDesde.value = dates[0]; exportHasta.value = dates[1]; }
};

const onFechaChange = () => { periodoActivo.value = 'custom'; fetchMetricas(); };

const toggleFiltro = (key) => {
  const idx = filtrosActivos.value.indexOf(key);
  if (idx >= 0) filtrosActivos.value.splice(idx, 1);
  else filtrosActivos.value.push(key);
};

const fetchMetricas = async () => {
  loading.value = true;
  try {
    const { data: res } = await api.get('/metricas', { params: { desde: desde.value, hasta: hasta.value } });
    data.value = res.data || res;
  } catch (e) { console.error(e); }
  finally { loading.value = false; }
};

const exportarExcel = async () => {
  if (!data.value) return;
  exportando.value = true;
  try {
    // Si el período de exportación es distinto al actual, fetchar datos nuevos
    let exportData = data.value;
    if (exportDesde.value !== desde.value || exportHasta.value !== hasta.value) {
      const { data: res } = await api.get('/metricas', { params: { desde: exportDesde.value, hasta: exportHasta.value } });
      exportData = res.data || res;
    }

    const { utils, writeFile } = await import('xlsx');
    const wb = { SheetNames: [], Sheets: {} };
    const addSheet = (name, rows) => {
      const ws = utils.json_to_sheet(rows);
      // Auto column width
      const cols = Object.keys(rows[0] || {});
      ws['!cols'] = cols.map(k => ({ wch: Math.max(k.length, 12) }));
      wb.SheetNames.push(name);
      wb.Sheets[name] = ws;
    };

    if (hojasExport.find(h => h.key === 'ingresos')?.activa) {
      const rows = (exportData.ingresosPorMes || []).map(m => ({ Mes: m.mes, 'Ingresos ($)': m.total }));
      if (rows.length) addSheet('Ingresos por mes', rows);
    }
    if (hojasExport.find(h => h.key === 'gastos')?.activa) {
      const rows = (exportData.gastosPorMes || []).map(m => ({ Mes: m.mes, 'Gastos ($)': m.total }));
      if (rows.length) addSheet('Gastos por mes', rows);
    }
    if (hojasExport.find(h => h.key === 'ocupacion')?.activa) {
      const o = exportData.ocupacion;
      if (o) addSheet('Ocupacion', [{ 'Total (alquiler)': o.total, Alquiladas: o.alquiladas, Disponibles: o.disponibles, Reservadas: o.reservadas, 'Tasa ocupación (%)': o.tasaOcupacion }]);
    }
    if (hojasExport.find(h => h.key === 'deuda')?.activa) {
      const rows = (exportData.pagosAtrasados || []).map(d => ({
        Inquilino: `${d.inquilino.nombre} ${d.inquilino.apellido}`,
        Email: d.inquilino.email || '',
        Telefono: d.inquilino.telefono || '',
        'Deuda total ($)': d.totalDeuda,
        Propiedades: d.pagos.map(p => p.propiedad).join(', '),
      }));
      if (rows.length) addSheet('Deuda inquilinos', rows);
    }

    if (wb.SheetNames.length === 0) { alert('No hay datos para exportar'); return; }
    writeFile(wb, `metricas_${exportDesde.value}_${exportHasta.value}.xlsx`);
    modalExport.value = false;
  } catch (e) {
    alert('Error al exportar: ' + e.message);
  } finally {
    exportando.value = false;
  }
};

onMounted(fetchMetricas);
</script>