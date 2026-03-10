<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap :size="24" class="text-primary-500" /> Facturas de servicios
        </h1>
        <p class="text-gray-500 text-sm mt-1">Servicios por propiedad</p>
      </div>
      <button @click="openModal(null)" class="btn-primary flex items-center gap-2">
        <Plus :size="18" /> Nueva factura
      </button>
    </div>

    <!-- Filtros -->
    <div class="card p-4 mb-5 flex gap-3 flex-wrap">
      <select v-model="filtroProp" @change="fetchFacturas" class="input w-56">
        <option value="">Todas las propiedades</option>
        <option v-for="p in propiedades" :key="p.id" :value="p.id">{{ p.titulo }}</option>
      </select>
      <select v-model="filtroEstado" @change="fetchFacturas" class="input w-40">
        <option value="">Todos los estados</option>
        <option value="PENDIENTE">Pendiente</option>
        <option value="PAGADO">Pagado</option>
        <option value="VENCIDO">Vencido</option>
      </select>
    </div>

    <!-- Alertas de próximas a vencer -->
    <div v-if="proximas.length" class="card p-4 mb-5 bg-orange-50 border-orange-200">
      <p class="text-sm font-semibold text-orange-700 flex items-center gap-2 mb-2">
        <AlertTriangle :size="15" /> {{ proximas.length }} factura(s) próxima(s) a vencer
      </p>
      <div class="space-y-1">
        <p v-for="f in proximas" :key="f.id" class="text-xs text-orange-600">
          {{ f.propiedad?.titulo }} — {{ tipoLabel(f.tipoServicio) }} — vence {{ formatFecha(f.fechaVence) }} — ${{ formatMonto(f.monto) }}
        </p>
      </div>
    </div>

    <!-- Tabla -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3 font-medium">Propiedad</th>
            <th class="px-5 py-3 font-medium">Servicio</th>
            <th class="px-5 py-3 font-medium">Vencimiento</th>
            <th class="px-5 py-3 font-medium">Estado</th>
            <th class="px-5 py-3 font-medium text-right">Monto</th>
            <th class="px-5 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="f in facturas" :key="f.id" class="hover:bg-gray-50"
            :class="esVencida(f) ? 'bg-red-50/30' : esPronta(f) ? 'bg-orange-50/30' : ''">
            <td class="px-5 py-4">
              <p class="font-medium text-gray-900">{{ f.propiedad?.titulo }}</p>
              <p class="text-xs text-gray-400">{{ f.propiedad?.direccion }}</p>
            </td>
            <td class="px-5 py-4">
              <span class="flex items-center gap-1.5 text-gray-700">
                <span>{{ tipoEmoji(f.tipoServicio) }}</span>
                {{ tipoLabel(f.tipoServicio) }}
              </span>
            </td>
            <td class="px-5 py-4 text-sm" :class="esVencida(f) ? 'text-red-600 font-medium' : esPronta(f) ? 'text-orange-600 font-medium' : 'text-gray-600'">
              {{ formatFecha(f.fechaVence) }}
              <span v-if="esVencida(f)" class="text-xs ml-1">⚠ VENCIDA</span>
              <span v-else-if="esPronta(f)" class="text-xs ml-1">⏰ pronto</span>
            </td>
            <td class="px-5 py-4">
              <span :class="estadoClass(f.estado)" class="text-xs px-2.5 py-1 rounded-full font-medium">{{ f.estado }}</span>
            </td>
            <td class="px-5 py-4 text-right font-semibold text-gray-800">${{ formatMonto(f.monto) }}</td>
            <td class="px-5 py-4">
              <div class="flex gap-2">
                <button v-if="f.estado === 'PENDIENTE'" @click="marcarPagado(f)" class="btn-secondary text-xs py-1.5 px-3 text-green-600">Pagar</button>
                <button @click="openModal(f)" class="btn-secondary text-xs py-1.5 px-2"><Pencil :size="12" /></button>
                <button @click="eliminar(f)" class="btn-secondary text-xs py-1.5 px-2 text-red-500"><Trash2 :size="12" /></button>
              </div>
            </td>
          </tr>
          <tr v-if="!facturas.length">
            <td colspan="6" class="text-center py-12 text-gray-400">No hay facturas registradas</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="modal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">{{ editando ? 'Editar factura' : 'Nueva factura' }}</h2>
          <button @click="modal = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <form @submit.prevent="guardar" class="space-y-4">
          <div>
            <label class="label">Propiedad</label>
            <select v-model="form.propiedadId" class="input" required>
              <option value="">Seleccionar...</option>
              <option v-for="p in propiedades" :key="p.id" :value="p.id">{{ p.titulo }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Tipo de servicio</label>
              <select v-model="form.tipoServicio" class="input" required>
                <option v-for="t in tipos" :key="t.value" :value="t.value">{{ t.emoji }} {{ t.label }}</option>
              </select>
            </div>
            <div>
              <label class="label">Monto</label>
              <input v-model.number="form.monto" type="number" min="0" step="0.01" class="input" required />
            </div>
          </div>
          <div>
            <label class="label">Fecha de vencimiento</label>
            <input v-model="form.fechaVence" type="date" class="input" required />
          </div>
          <div>
            <label class="label">Notas <span class="text-gray-400 font-normal">(opcional)</span></label>
            <input v-model="form.notas" class="input" placeholder="Referencia, número de cuenta, etc." />
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
import { ref, onMounted } from 'vue';
import { Zap, Plus, Pencil, Trash2, X, AlertTriangle } from 'lucide-vue-next';
import api from '../../services/api.js';

const facturas = ref([]);
const proximas = ref([]);
const propiedades = ref([]);
const loading = ref(true);
const modal = ref(false);
const saving = ref(false);
const formError = ref('');
const editando = ref(null);
const filtroProp = ref('');
const filtroEstado = ref('');

const tipos = [
  { value: 'LUZ', label: 'Luz', emoji: '💡' },
  { value: 'GAS', label: 'Gas', emoji: '🔥' },
  { value: 'AGUA', label: 'Agua', emoji: '💧' },
  { value: 'INTERNET', label: 'Internet', emoji: '🌐' },
  { value: 'EXPENSAS', label: 'Expensas', emoji: '🏢' },
  { value: 'TELEFONO', label: 'Teléfono', emoji: '📞' },
  { value: 'OTRO', label: 'Otro', emoji: '📄' },
];

const defaultForm = () => ({ propiedadId: '', tipoServicio: 'LUZ', monto: 0, fechaVence: '', notas: '' });
const form = ref(defaultForm());

const tipoLabel = (t) => tipos.find(x => x.value === t)?.label || t;
const tipoEmoji = (t) => tipos.find(x => x.value === t)?.emoji || '📄';
const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—';
const estadoClass = (e) => ({ PENDIENTE: 'bg-yellow-50 text-yellow-700', PAGADO: 'bg-green-50 text-green-700', VENCIDO: 'bg-red-50 text-red-700' }[e] || '');

const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
const en7 = new Date(hoy); en7.setDate(en7.getDate() + 7);
const esVencida = (f) => f.estado === 'PENDIENTE' && new Date(f.fechaVence) < hoy;
const esPronta = (f) => f.estado === 'PENDIENTE' && new Date(f.fechaVence) >= hoy && new Date(f.fechaVence) <= en7;

const fetchFacturas = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filtroProp.value) params.propiedadId = filtroProp.value;
    if (filtroEstado.value) params.estado = filtroEstado.value;
    const { data } = await api.get('/facturas', { params });
    facturas.value = data.data || data;
  } finally { loading.value = false; }
};

const fetchProximas = async () => {
  const { data } = await api.get('/facturas/proximas');
  proximas.value = data.data || data;
};

const fetchPropiedades = async () => {
  const { data } = await api.get('/properties', { params: { limit: 100 } });
  const d = data.data || data; propiedades.value = d.data || d;
};

const openModal = (f) => {
  editando.value = f;
  form.value = f ? { propiedadId: f.propiedadId, tipoServicio: f.tipoServicio, monto: Number(f.monto), fechaVence: f.fechaVence?.split('T')[0], notas: f.notas || '' } : defaultForm();
  formError.value = '';
  modal.value = true;
};

const guardar = async () => {
  saving.value = true; formError.value = '';
  try {
    if (editando.value) await api.put(`/facturas/${editando.value.id}`, form.value);
    else await api.post('/facturas', form.value);
    modal.value = false;
    fetchFacturas();
    fetchProximas();
  } catch (e) { formError.value = e.response?.data?.error || 'Error al guardar'; }
  finally { saving.value = false; }
};

const marcarPagado = async (f) => {
  await api.put(`/facturas/${f.id}`, { estado: 'PAGADO' });
  fetchFacturas();
  fetchProximas();
};

const eliminar = async (f) => {
  if (!confirm(`¿Eliminar factura de ${tipoLabel(f.tipoServicio)}?`)) return;
  await api.delete(`/facturas/${f.id}`);
  fetchFacturas();
};

onMounted(async () => {
  await fetchPropiedades();
  fetchFacturas();
  fetchProximas();
});
</script>
