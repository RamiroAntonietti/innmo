<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users :size="24" class="text-primary-500" /> Clientes
        </h1>
        <p class="text-gray-500 text-sm mt-1">{{ total }} clientes registrados</p>
      </div>
      <button @click="openModal(null)" class="btn-primary flex items-center gap-2">
        <Plus :size="18" /> Nuevo cliente
      </button>
    </div>

    <!-- Filtros -->
    <div class="card p-4 mb-5 flex gap-3 flex-wrap">
      <input v-model="search" @input="fetchClientes" class="input flex-1 min-w-[200px]" placeholder="Buscar por nombre, email..." />
      <select v-model="filtroTipo" @change="fetchClientes" class="input w-40">
        <option value="">Todos los tipos</option>
        <option v-for="t in tipos" :key="t" :value="t">{{ t }}</option>
      </select>
      <select v-model="filtroEstado" @change="fetchClientes" class="input w-40">
        <option value="">Todos los estados</option>
        <option v-for="e in estados" :key="e" :value="e">{{ e }}</option>
      </select>
    </div>

    <!-- Tabla -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3 font-medium">Cliente</th>
            <th class="px-5 py-3 font-medium">Contacto</th>
            <th class="px-5 py-3 font-medium">Tipo</th>
            <th class="px-5 py-3 font-medium">Estado</th>
            <th class="px-5 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="c in clientes" :key="c.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-5 py-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-bold text-primary-600">
                  {{ c.nombre[0] }}{{ c.apellido[0] }}
                </div>
                <p class="font-semibold text-gray-900">{{ c.nombre }} {{ c.apellido }}</p>
              </div>
            </td>
            <td class="px-5 py-4 text-gray-600">
              <p>{{ c.email || '—' }}</p>
              <p class="text-xs text-gray-400">{{ c.telefono || '' }}</p>
            </td>
            <td class="px-5 py-4"><span class="badge-blue">{{ c.tipo }}</span></td>
            <td class="px-5 py-4">
              <span :class="estadoClass(c.estado)">{{ c.estado }}</span>
            </td>
            <td class="px-5 py-4">
              <div class="flex gap-2">
                <button @click="openModal(c)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
                  <Pencil :size="12" /> Editar
                </button>
                <button v-if="isAdmin" @click="desactivar(c)"
                  class="btn-secondary text-xs py-1.5 px-3 text-yellow-600 flex items-center gap-1.5"
                  :disabled="c.estado === 'CERRADO'">
                  <UserMinus :size="12" /> Desactivar
                </button>
                <button v-if="isAdmin" @click="eliminar(c)" class="btn-secondary text-xs py-1.5 px-3 text-red-500 flex items-center gap-1.5">
                  <Trash2 :size="12" /> Eliminar
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!clientes.length">
            <td colspan="5" class="text-center py-12 text-gray-400">No hay clientes</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="modal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">{{ editando ? 'Editar cliente' : 'Nuevo cliente' }}</h2>
          <button @click="modal = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" class="text-gray-500" /></button>
        </div>

        <!-- Error de API -->
        <div v-if="apiError" class="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
          <span class="flex-shrink-0">✕</span> {{ apiError }}
        </div>

        <form @submit.prevent="guardar" class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Nombre *</label>
              <input v-model="form.nombre" class="input" :class="{ 'border-red-400': errors.nombre }" />
              <p v-if="errors.nombre" class="text-xs text-red-500 mt-1">{{ errors.nombre }}</p>
            </div>
            <div>
              <label class="label">Apellido *</label>
              <input v-model="form.apellido" class="input" :class="{ 'border-red-400': errors.apellido }" />
              <p v-if="errors.apellido" class="text-xs text-red-500 mt-1">{{ errors.apellido }}</p>
            </div>
          </div>

          <div>
            <label class="label">Email</label>
            <input v-model="form.email" type="email" class="input" :class="{ 'border-red-400': errors.email }" />
            <p v-if="errors.email" class="text-xs text-red-500 mt-1">{{ errors.email }}</p>
          </div>

          <div>
            <label class="label">Teléfono</label>
            <input v-model="form.telefono" class="input" :class="{ 'border-red-400': errors.telefono }" placeholder="Ej: 11-4523-8876" />
            <p v-if="errors.telefono" class="text-xs text-red-500 mt-1">{{ errors.telefono }}</p>
          </div>

          <div>
            <label class="label">Tipo *</label>
            <select v-model="form.tipo" class="input" :class="{ 'border-red-400': errors.tipo }">
              <option v-for="t in tipos" :key="t" :value="t">{{ t }}</option>
            </select>
            <p v-if="errors.tipo" class="text-xs text-red-500 mt-1">{{ errors.tipo }}</p>
          </div>

          <div>
            <label class="label">Estado</label>
            <select v-model="form.estado" class="input">
              <option v-for="e in estados" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>

          <div>
            <label class="label">Notas</label>
            <textarea v-model="form.notas" class="input h-20 resize-none" />
          </div>

          <div class="flex gap-3 pt-2">
            <button type="button" @click="modal = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="saving" class="btn-primary flex-1">
              {{ saving ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Users, Plus, Pencil, Trash2, X, UserMinus } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth.js';
import api from '../../services/api.js';

const { isAdmin } = useAuthStore();
const clientes = ref([]);
const total = ref(0);
const loading = ref(true);
const modal = ref(false);
const saving = ref(false);
const apiError = ref('');
const errors = ref({});
const editando = ref(null);
const search = ref('');
const filtroTipo = ref('');
const filtroEstado = ref('');

const tipos = ['COMPRADOR', 'VENDEDOR', 'INQUILINO', 'PROPIETARIO'];
const estados = ['ACTIVO', 'PROSPECTO', 'CERRADO'];

const form = ref({ nombre: '', apellido: '', email: '', telefono: '', tipo: 'INQUILINO', estado: 'ACTIVO', notas: '' });

const estadoClass = (e) => ({
  ACTIVO: 'badge-green', PROSPECTO: 'badge-yellow', CERRADO: 'badge-gray'
}[e] || 'badge-gray');

// ── Validación frontend ──
const validar = () => {
  const e = {};
  if (!form.value.nombre || form.value.nombre.trim().length < 2)
    e.nombre = 'El nombre debe tener al menos 2 caracteres.';
  if (!form.value.apellido || form.value.apellido.trim().length < 2)
    e.apellido = 'El apellido debe tener al menos 2 caracteres.';
  if (form.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email))
    e.email = 'Email inválido.';
  if (form.value.telefono && form.value.telefono.replace(/\D/g, '').length < 8)
    e.telefono = 'El teléfono debe tener al menos 8 dígitos.';
  if (!form.value.tipo)
    e.tipo = 'El tipo es obligatorio.';
  errors.value = e;
  return Object.keys(e).length === 0;
};

const fetchClientes = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/clients', { params: { search: search.value, tipo: filtroTipo.value, estado: filtroEstado.value } });
    const d = data.data || data;
    clientes.value = d.data || d;
    total.value = d.total || clientes.value.length;
  } finally { loading.value = false; }
};

const openModal = (c) => {
  editando.value = c;
  form.value = c ? { ...c } : { nombre: '', apellido: '', email: '', telefono: '', tipo: 'INQUILINO', estado: 'ACTIVO', notas: '' };
  errors.value = {};
  apiError.value = '';
  modal.value = true;
};

const guardar = async () => {
  if (!validar()) return;
  saving.value = true; apiError.value = '';
  try {
    if (editando.value) await api.put(`/clients/${editando.value.id}`, form.value);
    else await api.post('/clients', form.value);
    modal.value = false;
    fetchClientes();
  } catch (e) {
    const msg = e.response?.data?.message || e.response?.data?.error || 'Error al guardar';
    apiError.value = Array.isArray(msg) ? msg.join(' • ') : msg;
  } finally { saving.value = false; }
};

const desactivar = async (c) => {
  if (!confirm(`¿Desactivar a ${c.nombre} ${c.apellido}? Podrás reactivarlo editando su estado.`)) return;
  try {
    await api.put(`/clients/${c.id}/desactivar`);
    fetchClientes();
  } catch (e) {
    alert(e.response?.data?.message || 'Error al desactivar');
  }
};

const eliminar = async (c) => {
  if (!confirm(`¿Eliminar definitivamente a ${c.nombre} ${c.apellido}?\n\nSi tiene contratos activos o historial de pagos, solo podrás desactivarlo.`)) return;
  try {
    await api.delete(`/clients/${c.id}`);
    fetchClientes();
  } catch (e) {
    alert(e.response?.data?.message || e.response?.data?.error || 'No se puede eliminar este cliente.');
  }
};

onMounted(fetchClientes);
</script>
