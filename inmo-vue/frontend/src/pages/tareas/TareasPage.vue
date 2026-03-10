<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CheckSquare :size="24" class="text-primary-500" /> Tareas
        </h1>
        <p class="text-gray-500 text-sm mt-1">Tus pendientes y recordatorios</p>
      </div>
      <button @click="openModal(null)" class="btn-primary flex items-center gap-2">
        <Plus :size="18" /> Nueva tarea
      </button>
    </div>

    <!-- Resumen KPIs -->
    <div class="grid grid-cols-4 gap-4 mb-6" v-if="resumen">
      <div class="card p-4 cursor-pointer hover:shadow-md transition-shadow" @click="filtroEstado = ''; fetchTareas()">
        <p class="text-xs text-gray-500 mb-1">Pendientes</p>
        <p class="text-2xl font-bold text-yellow-500">{{ resumen.pendientes }}</p>
      </div>
      <div class="card p-4 cursor-pointer hover:shadow-md transition-shadow" @click="filtroEstado = 'EN_PROGRESO'; fetchTareas()">
        <p class="text-xs text-gray-500 mb-1">En progreso</p>
        <p class="text-2xl font-bold text-blue-500">{{ resumen.enProgreso }}</p>
      </div>
      <div class="card p-4 cursor-pointer hover:shadow-md transition-shadow border-yellow-200" @click="filtroEstado = 'PENDIENTE'; fetchTareas()">
        <p class="text-xs text-gray-500 mb-1">Vencen hoy</p>
        <p class="text-2xl font-bold text-orange-500">{{ resumen.vencenHoy }}</p>
      </div>
      <div class="card p-4 cursor-pointer hover:shadow-md transition-shadow border-red-100" @click="filtroEstado = 'PENDIENTE'; fetchTareas()">
        <p class="text-xs text-gray-500 mb-1">Vencidas</p>
        <p class="text-2xl font-bold text-red-500">{{ resumen.vencidas }}</p>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card p-4 mb-5 flex gap-3 flex-wrap">
      <select v-model="filtroEstado" @change="fetchTareas" class="input w-44">
        <option value="">Todos los estados</option>
        <option value="PENDIENTE">Pendiente</option>
        <option value="EN_PROGRESO">En progreso</option>
        <option value="COMPLETADA">Completada</option>
        <option value="CANCELADA">Cancelada</option>
      </select>
      <select v-model="filtroTipo" @change="fetchTareas" class="input w-52">
        <option value="">Todos los tipos</option>
        <option v-for="t in tipos" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
      <select v-model="filtroPrioridad" @change="fetchTareas" class="input w-40">
        <option value="">Todas las prioridades</option>
        <option value="ALTA">Alta</option>
        <option value="MEDIA">Media</option>
        <option value="BAJA">Baja</option>
      </select>
    </div>

    <!-- Lista de tareas -->
    <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
    <div v-else class="space-y-3">
      <div
        v-for="t in tareas" :key="t.id"
        class="card p-5 flex items-start gap-4 transition-all"
        :class="t.estado === 'COMPLETADA' ? 'opacity-50' : t.vencida ? 'border-red-200 bg-red-50/30' : t.venceHoy ? 'border-orange-200 bg-orange-50/30' : ''"
      >
        <!-- Checkbox completar -->
        <button @click="completar(t)" :disabled="t.estado === 'COMPLETADA' || t.estado === 'CANCELADA'"
          class="mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors"
          :class="t.estado === 'COMPLETADA' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-primary-400'">
          <Check v-if="t.estado === 'COMPLETADA'" :size="12" />
        </button>

        <!-- Contenido -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <p class="font-semibold text-gray-900" :class="t.estado === 'COMPLETADA' ? 'line-through text-gray-400' : ''">
                {{ t.titulo }}
              </p>
              <p v-if="t.descripcion" class="text-sm text-gray-500 mt-0.5">{{ t.descripcion }}</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <span :class="prioridadClass(t.prioridad)" class="text-xs px-2 py-0.5 rounded-full font-medium">{{ t.prioridad }}</span>
              <span :class="estadoClass(t.estado)" class="text-xs px-2 py-0.5 rounded-full font-medium">{{ estadoLabel(t.estado) }}</span>
            </div>
          </div>

          <!-- Meta info -->
          <div class="flex items-center gap-4 mt-2 flex-wrap">
            <span class="flex items-center gap-1 text-xs text-gray-500">
              <component :is="tipoIcon(t.tipo)" :size="12" />
              {{ tipoLabel(t.tipo) }}
            </span>
            <span v-if="t.fechaVence" class="flex items-center gap-1 text-xs"
              :class="t.vencida ? 'text-red-500 font-medium' : t.venceHoy ? 'text-orange-500 font-medium' : 'text-gray-500'">
              <CalendarDays :size="12" />
              {{ t.vencida ? '⚠ Venció' : t.venceHoy ? '⏰ Vence hoy' : 'Vence' }} {{ formatFecha(t.fechaVence) }}
            </span>
            <span v-if="t.cliente" class="flex items-center gap-1 text-xs text-blue-600">
              <User :size="12" /> {{ t.cliente.nombre }} {{ t.cliente.apellido }}
            </span>
            <span v-if="t.propiedad" class="flex items-center gap-1 text-xs text-purple-600">
              <Building2 :size="12" /> {{ t.propiedad.titulo }}
            </span>
          </div>
        </div>

        <!-- Acciones -->
        <div class="flex gap-2 flex-shrink-0">
          <button v-if="t.estado === 'PENDIENTE'" @click="cambiarEstado(t, 'EN_PROGRESO')"
            class="btn-secondary text-xs py-1.5 px-3 text-blue-600">En progreso</button>
          <button @click="openModal(t)" class="btn-secondary text-xs py-1.5 px-2"><Pencil :size="12" /></button>
          <button @click="eliminar(t)" class="btn-secondary text-xs py-1.5 px-2 text-red-500"><Trash2 :size="12" /></button>
        </div>
      </div>

      <div v-if="!tareas.length" class="text-center py-12 text-gray-400">
        No hay tareas {{ filtroEstado ? 'con ese estado' : '' }}
      </div>
    </div>

    <!-- Modal -->
    <div v-if="modal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-lg p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">{{ editando ? 'Editar tarea' : 'Nueva tarea' }}</h2>
          <button @click="modal = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <form @submit.prevent="guardar" class="space-y-4">
          <div>
            <label class="label">Título</label>
            <input v-model="form.titulo" class="input" placeholder="Ej: Llamar a Juan García" required />
          </div>
          <div>
            <label class="label">Descripción <span class="text-gray-400 font-normal">(opcional)</span></label>
            <textarea v-model="form.descripcion" class="input h-20 resize-none" placeholder="Detalles adicionales..." />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Tipo</label>
              <select v-model="form.tipo" class="input" required>
                <option v-for="t in tipos" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
            <div>
              <label class="label">Prioridad</label>
              <select v-model="form.prioridad" class="input">
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
          </div>
          <div>
            <label class="label">Fecha de vencimiento <span class="text-gray-400 font-normal">(opcional)</span></label>
            <input v-model="form.fechaVence" type="date" class="input" />
          </div>
          <div>
            <label class="label">Vincular a cliente <span class="text-gray-400 font-normal">(opcional)</span></label>
            <select v-model="form.clienteId" class="input">
              <option value="">Sin cliente</option>
              <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nombre }} {{ c.apellido }}</option>
            </select>
          </div>
          <div>
            <label class="label">Vincular a propiedad <span class="text-gray-400 font-normal">(opcional)</span></label>
            <select v-model="form.propiedadId" class="input">
              <option value="">Sin propiedad</option>
              <option v-for="p in propiedades" :key="p.id" :value="p.id">{{ p.titulo }}</option>
            </select>
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
import {
  CheckSquare, Plus, Check, Pencil, Trash2, X,
  CalendarDays, User, Building2, Phone, Eye, FileText, Clock
} from 'lucide-vue-next';
import api from '../../services/api.js';

const tareas = ref([]);
const resumen = ref(null);
const clientes = ref([]);
const propiedades = ref([]);
const loading = ref(true);
const modal = ref(false);
const saving = ref(false);
const formError = ref('');
const editando = ref(null);
const filtroEstado = ref('');
const filtroTipo = ref('');
const filtroPrioridad = ref('');

const tipos = [
  { value: 'SEGUIMIENTO_CLIENTE', label: 'Seguimiento de cliente' },
  { value: 'VISITA_PROPIEDAD', label: 'Visita a propiedad' },
  { value: 'LLAMADA', label: 'Llamada pendiente' },
  { value: 'VENCIMIENTO_CONTRATO', label: 'Vencimiento de contrato' },
  { value: 'PAGO_PENDIENTE', label: 'Pago pendiente' },
  { value: 'GENERAL', label: 'Tarea general' },
];

const defaultForm = () => ({
  titulo: '', descripcion: '', tipo: 'GENERAL', prioridad: 'MEDIA',
  fechaVence: '', clienteId: '', propiedadId: '',
});
const form = ref(defaultForm());

const tipoIcon = (t) => ({
  SEGUIMIENTO_CLIENTE: User, VISITA_PROPIEDAD: Building2, LLAMADA: Phone,
  VENCIMIENTO_CONTRATO: FileText, PAGO_PENDIENTE: Clock, GENERAL: CheckSquare,
}[t] || CheckSquare);

const tipoLabel = (t) => tipos.find(x => x.value === t)?.label || t;
const estadoLabel = (e) => ({ PENDIENTE: 'Pendiente', EN_PROGRESO: 'En progreso', COMPLETADA: 'Completada', CANCELADA: 'Cancelada' }[e] || e);
const estadoClass = (e) => ({ PENDIENTE: 'badge-yellow', EN_PROGRESO: 'badge-blue', COMPLETADA: 'badge-green', CANCELADA: 'badge-gray' }[e] || 'badge-gray');
const prioridadClass = (p) => ({ ALTA: 'bg-red-50 text-red-600', MEDIA: 'bg-yellow-50 text-yellow-600', BAJA: 'bg-gray-100 text-gray-500' }[p] || '');
const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—';

const fetchTareas = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filtroEstado.value) params.estado = filtroEstado.value;
    if (filtroTipo.value) params.tipo = filtroTipo.value;
    if (filtroPrioridad.value) params.prioridad = filtroPrioridad.value;
    const { data } = await api.get('/tareas', { params });
    tareas.value = data.data || data;
  } finally { loading.value = false; }
};

const fetchResumen = async () => {
  const { data } = await api.get('/tareas/resumen');
  resumen.value = data.data || data;
};

const fetchSelectores = async () => {
  const [c, p] = await Promise.all([
    api.get('/clients', { params: { limit: 200 } }),
    api.get('/properties', { params: { limit: 200 } }),
  ]);
  const cd = c.data.data || c.data; clientes.value = cd.data || cd;
  const pd = p.data.data || p.data; propiedades.value = pd.data || pd;
};

const openModal = (t) => {
  editando.value = t;
  form.value = t ? {
    titulo: t.titulo, descripcion: t.descripcion || '', tipo: t.tipo,
    prioridad: t.prioridad, fechaVence: t.fechaVence?.split('T')[0] || '',
    clienteId: t.clienteId || '', propiedadId: t.propiedadId || '',
  } : defaultForm();
  formError.value = '';
  modal.value = true;
};

const guardar = async () => {
  saving.value = true; formError.value = '';
  try {
    const payload = { ...form.value };
    if (!payload.clienteId) delete payload.clienteId;
    if (!payload.propiedadId) delete payload.propiedadId;
    if (!payload.fechaVence) delete payload.fechaVence;
    if (editando.value) await api.put(`/tareas/${editando.value.id}`, payload);
    else await api.post('/tareas', payload);
    modal.value = false;
    fetchTareas();
    fetchResumen();
  } catch (e) { formError.value = e.response?.data?.error || 'Error al guardar'; }
  finally { saving.value = false; }
};

const completar = async (t) => {
  await api.post(`/tareas/${t.id}/completar`);
  fetchTareas();
  fetchResumen();
};

const cambiarEstado = async (t, estado) => {
  await api.put(`/tareas/${t.id}`, { estado });
  fetchTareas();
  fetchResumen();
};

const eliminar = async (t) => {
  if (!confirm(`¿Eliminar "${t.titulo}"?`)) return;
  await api.delete(`/tareas/${t.id}`);
  fetchTareas();
  fetchResumen();
};

onMounted(async () => {
  await fetchSelectores();
  fetchTareas();
  fetchResumen();
});
</script>
