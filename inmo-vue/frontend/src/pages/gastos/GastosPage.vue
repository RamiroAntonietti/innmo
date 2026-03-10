<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt :size="24" class="text-primary-500" /> Gastos
        </h1>
        <p class="text-gray-500 text-sm mt-1">Gestión de gastos y rentabilidad por propiedad</p>
      </div>
      <button @click="openModal(null)" class="btn-primary flex items-center gap-2">
        <Plus :size="18" /> Registrar gasto
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
      <button @click="tab = 'gastos'" :class="tab === 'gastos' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all">Lista de gastos</button>
      <button @click="tab = 'rentabilidad'; fetchResumen()" :class="tab === 'rentabilidad' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all">Rentabilidad</button>
    </div>

    <!-- TAB: Lista de gastos -->
    <template v-if="tab === 'gastos'">
      <!-- Filtros -->
      <div class="card p-4 mb-5 flex gap-3 flex-wrap">
        <select v-model="filtroProp" @change="fetchGastos" class="input w-56">
          <option value="">Todas las propiedades</option>
          <option v-for="p in propiedades" :key="p.id" :value="p.id">{{ p.titulo }}</option>
        </select>
        <select v-model="filtroTipo" @change="fetchGastos" class="input w-44">
          <option value="">Todos los tipos</option>
          <option v-for="t in tiposGasto" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
        <select v-model="filtroPagadoPor" @change="fetchGastos" class="input w-44">
          <option value="">Todos</option>
          <option value="PROPIETARIO">Pagado por propietario</option>
          <option value="INMOBILIARIA">Pagado por inmobiliaria</option>
        </select>
        <div class="flex gap-2">
          <input v-model="filtroDesde" @change="fetchGastos" type="date" class="input w-40" />
          <input v-model="filtroHasta" @change="fetchGastos" type="date" class="input w-40" />
        </div>
      </div>

      <!-- Total -->
      <div v-if="totalGastos > 0" class="card p-4 mb-5 flex items-center gap-4 bg-red-50 border-red-100">
        <div class="p-2 bg-red-100 rounded-lg"><TrendingDown :size="20" class="text-red-500" /></div>
        <div>
          <p class="text-xs text-red-600">Total gastos filtrados</p>
          <p class="text-2xl font-bold text-red-600">${{ formatMonto(totalGastos) }}</p>
        </div>
      </div>

      <!-- Tabla -->
      <div class="card overflow-hidden">
        <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
        <div v-else class="table-wrap">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr class="text-left text-xs text-gray-500">
              <th class="px-5 py-3 font-medium">Código</th>
              <th class="px-5 py-3 font-medium">Propiedad</th>
              <th class="px-5 py-3 font-medium">Tipo</th>
              <th class="px-5 py-3 font-medium">Descripción</th>
              <th class="px-5 py-3 font-medium">Fecha</th>
              <th class="px-5 py-3 font-medium">Pagado por</th>
              <th class="px-5 py-3 font-medium text-right">Monto</th>
              <th class="px-5 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="g in gastos" :key="g.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-5 py-4">
                <span class="font-mono text-xs text-gray-500">{{ g.codigo || '—' }}</span>
              </td>
              <td class="px-5 py-4">
                <p class="font-medium text-gray-900">{{ g.propiedad?.titulo }}</p>
                <p class="text-xs text-gray-400">{{ g.propiedad?.direccion }}</p>
              </td>
              <td class="px-5 py-4">
                <span :class="tipoClass(g.tipo)" class="text-xs px-2.5 py-1 rounded-full font-medium">
                  {{ tipoLabel(g.tipo) }}
                </span>
              </td>
              <td class="px-5 py-4 text-gray-700 max-w-[200px] truncate">{{ g.descripcion }}</td>
              <td class="px-5 py-4 text-gray-500 text-xs">{{ formatFecha(g.fecha) }}</td>
              <td class="px-5 py-4">
                <span :class="g.pagadoPor === 'INMOBILIARIA' ? 'badge-blue' : 'badge-gray'">
                  {{ g.pagadoPor === 'INMOBILIARIA' ? 'Inmobiliaria' : 'Propietario' }}
                </span>
              </td>
              <td class="px-5 py-4 text-right font-semibold text-red-600">${{ formatMonto(g.monto) }}</td>
              <td class="px-5 py-4">
                <div class="flex gap-2">
                  <button @click="openModal(g)" class="btn-secondary text-xs py-1.5 px-3"><Pencil :size="12" /></button>
                  <button @click="eliminar(g)" class="btn-secondary text-xs py-1.5 px-3 text-red-500"><Trash2 :size="12" /></button>
                </div>
              </td>
            </tr>
            <tr v-if="!gastos.length">
              <td colspan="8" class="text-center py-12 text-gray-400">No hay gastos registrados</td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </template>

    <!-- TAB: Rentabilidad -->
    <template v-if="tab === 'rentabilidad'">
      <div v-if="loadingResumen" class="text-center py-16 text-gray-400">Cargando...</div>
      <div v-else>
        <!-- Totales generales -->
        <div class="grid grid-cols-3 gap-4 mb-6">
          <div class="card p-5">
            <p class="text-xs text-gray-500 mb-1">Total ingresos</p>
            <p class="text-2xl font-bold text-green-600">${{ formatMonto(totalesGenerales.ingresos) }}</p>
          </div>
          <div class="card p-5">
            <p class="text-xs text-gray-500 mb-1">Total gastos</p>
            <p class="text-2xl font-bold text-red-500">${{ formatMonto(totalesGenerales.gastos) }}</p>
          </div>
          <div class="card p-5">
            <p class="text-xs text-gray-500 mb-1">Rentabilidad neta</p>
            <p class="text-2xl font-bold" :class="totalesGenerales.neta >= 0 ? 'text-primary-600' : 'text-red-600'">
              ${{ formatMonto(totalesGenerales.neta) }}
            </p>
          </div>
        </div>

        <!-- Por propiedad -->
        <div class="card overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr class="text-left text-xs text-gray-500">
                <th class="px-5 py-3 font-medium">Propiedad</th>
                <th class="px-5 py-3 font-medium text-right">Ingresos</th>
                <th class="px-5 py-3 font-medium text-right">Gastos</th>
                <th class="px-5 py-3 font-medium text-right">Rentabilidad</th>
                <th class="px-5 py-3 font-medium text-right">%</th>
                <th class="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="p in resumen" :key="p.id" class="hover:bg-gray-50 cursor-pointer" @click="verDetalle(p.id)">
                <td class="px-5 py-4">
                  <p class="font-semibold text-gray-900">{{ p.titulo }}</p>
                  <p class="text-xs text-gray-400">{{ p.direccion }}</p>
                </td>
                <td class="px-5 py-4 text-right text-green-600 font-medium">${{ formatMonto(p.totalIngresos) }}</td>
                <td class="px-5 py-4 text-right text-red-500 font-medium">${{ formatMonto(p.totalGastos) }}</td>
                <td class="px-5 py-4 text-right font-bold" :class="p.rentabilidad >= 0 ? 'text-primary-600' : 'text-red-600'">
                  ${{ formatMonto(p.rentabilidad) }}
                </td>
                <td class="px-5 py-4 text-right">
                  <span :class="p.rentabilidadPct >= 0 ? 'badge-green' : 'badge-red'">
                    {{ p.rentabilidadPct }}%
                  </span>
                </td>
                <td class="px-5 py-4">
                  <div class="w-32 bg-gray-100 rounded-full h-2">
                    <div class="h-2 rounded-full transition-all"
                      :class="p.rentabilidadPct >= 0 ? 'bg-green-500' : 'bg-red-400'"
                      :style="`width: ${Math.min(Math.abs(p.rentabilidadPct), 100)}%`" />
                  </div>
                </td>
              </tr>
              <tr v-if="!resumen.length">
                <td colspan="6" class="text-center py-12 text-gray-400">Sin datos</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Modal gasto -->
    <div v-if="modal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">{{ editando ? 'Editar gasto' : 'Registrar gasto' }}</h2>
          <button @click="modal = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <form @submit.prevent="guardar" class="space-y-4">
          <div>
            <label class="label">Propiedad</label>
            <select v-model="form.propiedadId" class="input" required>
              <option value="">Seleccionar propiedad</option>
              <option v-for="p in propiedades" :key="p.id" :value="p.id">{{ p.titulo }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Tipo</label>
              <select v-model="form.tipo" class="input" required>
                <option v-for="t in tiposGasto" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div>
              <label class="label">Pagado por</label>
              <select v-model="form.pagadoPor" class="input">
                <option value="PROPIETARIO">Propietario</option>
                <option value="INMOBILIARIA">Inmobiliaria</option>
              </select>
            </div>
          </div>
          <div>
            <label class="label">Descripción</label>
            <input v-model="form.descripcion" class="input" placeholder="Ej: Reparación cañería cocina" required />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Monto</label>
              <input v-model.number="form.monto" type="number" min="0" step="0.01" class="input" required />
            </div>
            <div>
              <label class="label">Fecha</label>
              <input v-model="form.fecha" type="date" class="input" required />
            </div>
          </div>
          <div>
            <label class="label">Comprobante / referencia <span class="text-gray-400 font-normal">(opcional)</span></label>
            <input v-model="form.comprobante" class="input" placeholder="Nro. factura o referencia" />
          </div>
          <p v-if="formError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ formError }}</p>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modal = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Receipt, Plus, Pencil, Trash2, X, TrendingDown } from 'lucide-vue-next';
import api from '../../services/api.js';

const tab = ref('gastos');
const gastos = ref([]);
const resumen = ref([]);
const propiedades = ref([]);
const totalGastos = ref(0);
const loading = ref(true);
const loadingResumen = ref(false);
const modal = ref(false);
const saving = ref(false);
const formError = ref('');
const editando = ref(null);
const filtroProp = ref('');
const filtroTipo = ref('');
const filtroPagadoPor = ref('');
const filtroDesde = ref('');
const filtroHasta = ref('');

const tiposGasto = [
  { value: 'REPARACION', label: 'Reparación' },
  { value: 'IMPUESTO', label: 'Impuesto' },
  { value: 'EXPENSA', label: 'Expensa' },
  { value: 'SEGURO', label: 'Seguro' },
  { value: 'SERVICIO', label: 'Servicio' },
  { value: 'HONORARIO', label: 'Honorario' },
  { value: 'OTRO', label: 'Otro' },
];

const tipoColors = {
  REPARACION: 'bg-orange-50 text-orange-700',
  IMPUESTO: 'bg-red-50 text-red-700',
  EXPENSA: 'bg-purple-50 text-purple-700',
  SEGURO: 'bg-blue-50 text-blue-700',
  SERVICIO: 'bg-cyan-50 text-cyan-700',
  HONORARIO: 'bg-yellow-50 text-yellow-700',
  OTRO: 'bg-gray-100 text-gray-600',
};

const defaultForm = () => ({
  propiedadId: '', tipo: 'REPARACION', descripcion: '', monto: 0,
  fecha: new Date().toISOString().split('T')[0], pagadoPor: 'PROPIETARIO', comprobante: '',
});
const form = ref(defaultForm());

const totalesGenerales = computed(() => {
  const ingresos = resumen.value.reduce((s, p) => s + p.totalIngresos, 0);
  const gastos = resumen.value.reduce((s, p) => s + p.totalGastos, 0);
  return { ingresos, gastos, neta: ingresos - gastos };
});

const tipoClass = (t) => tipoColors[t] || 'bg-gray-100 text-gray-600';
const tipoLabel = (t) => tiposGasto.find(x => x.value === t)?.label || t;
const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—';

const fetchGastos = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filtroProp.value) params.propiedadId = filtroProp.value;
    if (filtroTipo.value) params.tipo = filtroTipo.value;
    if (filtroPagadoPor.value) params.pagadoPor = filtroPagadoPor.value;
    if (filtroDesde.value) params.desde = filtroDesde.value;
    if (filtroHasta.value) params.hasta = filtroHasta.value;
    const { data } = await api.get('/gastos', { params });
    const d = data.data || data;
    gastos.value = d.data || d;
    totalGastos.value = d.total || 0;
  } finally { loading.value = false; }
};

const fetchResumen = async () => {
  if (resumen.value.length) return;
  loadingResumen.value = true;
  try {
    const { data } = await api.get('/gastos/resumen');
    resumen.value = data.data || data;
  } finally { loadingResumen.value = false; }
};

const fetchPropiedades = async () => {
  const { data } = await api.get('/properties', { params: { limit: 100 } });
  const d = data.data || data;
  propiedades.value = d.data || d;
};

const openModal = (g) => {
  editando.value = g;
  form.value = g ? {
    propiedadId: g.propiedadId, tipo: g.tipo, descripcion: g.descripcion,
    monto: Number(g.monto), fecha: g.fecha?.split('T')[0],
    pagadoPor: g.pagadoPor, comprobante: g.comprobante || '',
  } : defaultForm();
  formError.value = '';
  modal.value = true;
};

const guardar = async () => {
  saving.value = true; formError.value = '';
  try {
    if (editando.value) await api.put(`/gastos/${editando.value.id}`, form.value);
    else await api.post('/gastos', form.value);
    modal.value = false;
    resumen.value = [];
    fetchGastos();
  } catch (e) { formError.value = e.response?.data?.error || 'Error al guardar'; }
  finally { saving.value = false; }
};

const eliminar = async (g) => {
  if (!confirm(`¿Eliminar gasto "${g.descripcion}"?`)) return;
  await api.delete(`/gastos/${g.id}`);
  resumen.value = [];
  fetchGastos();
};

const verDetalle = (propiedadId) => {
  filtroProp.value = propiedadId;
  tab.value = 'gastos';
  fetchGastos();
};

onMounted(async () => {
  await fetchPropiedades();
  fetchGastos();
});
</script>
