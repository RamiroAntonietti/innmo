<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 :size="24" class="text-primary-500" /> Propiedades
        </h1>
        <p class="text-gray-500 text-sm mt-1">{{ total }} propiedades registradas</p>
      </div>
      <button @click="openModal(null)" class="btn-primary flex items-center gap-2">
        <Plus :size="18" /> Nueva propiedad
      </button>
    </div>

    <div class="card p-4 mb-5 flex gap-3 flex-wrap">
      <input v-model="search" @input="fetchProps" class="input flex-1 min-w-[200px]" placeholder="Buscar por título, ciudad, dirección..." />
      <select v-model="filtroTipo" @change="fetchProps" class="input w-40">
        <option value="">Todos</option>
        <option value="ALQUILER">Alquiler</option>
        <option value="VENTA">Venta</option>
      </select>
      <select v-model="filtroEstado" @change="fetchProps" class="input w-44">
        <option value="">Todos los estados</option>
        <option v-for="e in estados" :key="e" :value="e">{{ e }}</option>
      </select>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-if="loading" class="col-span-3 text-center py-16 text-gray-400">Cargando...</div>
      <div v-for="p in propiedades" :key="p.id" class="card p-5 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1 min-w-0">
            <p class="font-mono text-xs text-gray-500 mb-0.5">{{ p.codigo || '—' }}</p>
            <p class="font-semibold text-gray-900 truncate">{{ p.titulo }}</p>
            <p class="text-sm text-gray-500 mt-0.5">{{ p.direccion }}, {{ p.ciudad }}</p>
          </div>
          <span :class="estadoClass(p.estado)" class="ml-2 flex-shrink-0">{{ p.estado }}</span>
        </div>
        <div class="flex items-center gap-3 text-xs text-gray-500 mb-4">
          <span v-if="p.dormitorios">🛏 {{ p.dormitorios }}</span>
          <span v-if="p.banos">🚿 {{ p.banos }}</span>
          <span v-if="p.metrosCuadrados">📐 {{ p.metrosCuadrados }}m²</span>
          <span v-if="p.amueblada" class="text-amber-600">🪑 Amueblada</span>
        </div>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs text-gray-400">{{ p.tipoOperacion }}</p>
            <p class="text-lg font-bold text-primary-600">${{ formatMonto(p.precio) }}{{ p.tipoOperacion === 'ALQUILER' ? '/mes' : '' }}</p>
          </div>
          <div class="flex gap-2">
            <button @click="router.push('/app/properties/' + p.id)" class="btn-secondary text-xs py-1.5 px-3"><Eye :size="12" /></button>
            <button @click="openModal(p)" class="btn-secondary text-xs py-1.5 px-3"><Pencil :size="12" /></button>
            <button v-if="isAdmin" @click="eliminar(p)" class="btn-secondary text-xs py-1.5 px-3 text-red-500"><Trash2 :size="12" /></button>
          </div>
        </div>
      </div>
      <div v-if="!loading && !propiedades.length" class="col-span-3 text-center py-12 text-gray-400">No hay propiedades</div>
    </div>

    <!-- Modal propiedad -->
    <div v-if="modal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div class="card w-full max-w-lg p-6 my-4">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">{{ editando ? 'Editar propiedad' : 'Nueva propiedad' }}</h2>
          <button @click="modal = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <form @submit.prevent="guardar" class="space-y-4">
          <div><label class="label">Título</label><input v-model="form.titulo" class="input" required /></div>
          <div><label class="label">Descripción</label><textarea v-model="form.descripcion" class="input h-20 resize-none" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Dirección</label><input v-model="form.direccion" class="input" required /></div>
            <div><label class="label">Ciudad</label><input v-model="form.ciudad" class="input" required /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Tipo operación</label>
              <select v-model="form.tipoOperacion" class="input" required>
                <option value="ALQUILER">Alquiler</option>
                <option value="VENTA">Venta</option>
              </select>
            </div>
            <div>
              <label class="label">{{ form.tipoOperacion === 'ALQUILER' ? 'Precio mensual' : 'Precio total' }}</label>
              <input v-model.number="form.precio" type="number" min="0" class="input" required :placeholder="form.tipoOperacion === 'ALQUILER' ? 'Monto por mes' : 'Precio de venta'" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div><label class="label">Dormitorios</label><input v-model.number="form.dormitorios" type="number" min="0" class="input" /></div>
            <div><label class="label">Baños</label><input v-model.number="form.banos" type="number" min="0" class="input" /></div>
            <div><label class="label">m²</label><input v-model.number="form.metrosCuadrados" type="number" min="0" class="input" /></div>
          </div>
          <!-- Propietario obligatorio -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="label mb-0">Propietario <span class="text-red-500">*</span></label>
              <button type="button" @click="modalNuevoPropietario = true" class="text-xs text-primary-500 hover:underline flex items-center gap-1">
                <UserPlus :size="12" /> Crear propietario
              </button>
            </div>
            <select v-model="form.propietarioId" class="input" required>
              <option value="">Seleccionar propietario</option>
              <option v-for="c in propietarios" :key="c.id" :value="c.id">{{ c.nombre }} {{ c.apellido }}</option>
            </select>
          </div>
          <div>
            <label class="label">Estado</label>
            <select v-model="form.estado" class="input">
              <option v-for="e in estados" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>
          <div v-if="form.tipoOperacion === 'ALQUILER'" class="flex items-center gap-2">
            <input v-model="form.amueblada" type="checkbox" id="amueblada" class="rounded border-gray-300" />
            <label for="amueblada" class="text-sm text-gray-600">Propiedad amueblada</label>
          </div>
          <p v-if="formError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ formError }}</p>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modal = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal rápido nuevo propietario -->
    <div v-if="modalNuevoPropietario" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Nuevo propietario</h2>
          <button @click="modalNuevoPropietario = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <form @submit.prevent="crearPropietario" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Nombre</label><input v-model="formPropietario.nombre" class="input" required /></div>
            <div><label class="label">Apellido</label><input v-model="formPropietario.apellido" class="input" required /></div>
          </div>
          <div><label class="label">Email</label><input v-model="formPropietario.email" type="email" class="input" /></div>
          <div><label class="label">Teléfono</label><input v-model="formPropietario.telefono" class="input" /></div>
          <p v-if="errorPropietario" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ errorPropietario }}</p>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modalNuevoPropietario = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="savingPropietario" class="btn-primary flex-1">{{ savingPropietario ? 'Creando...' : 'Crear y seleccionar' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Building2, Plus, Pencil, Trash2, X, UserPlus, Eye } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth.js';
import api from '../../services/api.js';

const { isAdmin } = useAuthStore();
const router = useRouter();
const propiedades = ref([]);
const propietarios = ref([]);
const total = ref(0);
const loading = ref(true);
const modal = ref(false);
const modalNuevoPropietario = ref(false);
const saving = ref(false);
const savingPropietario = ref(false);
const formError = ref('');
const errorPropietario = ref('');
const editando = ref(null);
const search = ref('');
const filtroTipo = ref('');
const filtroEstado = ref('');
const estados = ['DISPONIBLE', 'RESERVADO', 'ALQUILADO', 'VENDIDO'];

const defaultForm = () => ({ titulo: '', descripcion: '', direccion: '', ciudad: '', precio: 0, tipoOperacion: 'ALQUILER', estado: 'DISPONIBLE', dormitorios: null, banos: null, metrosCuadrados: null, propietarioId: '', amueblada: false });
const form = ref(defaultForm());
const formPropietario = ref({ nombre: '', apellido: '', email: '', telefono: '' });

const estadoClass = (e) => ({ DISPONIBLE: 'badge-green', RESERVADO: 'badge-yellow', ALQUILADO: 'badge-blue', VENDIDO: 'badge-gray' }[e] || 'badge-gray');
const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR');

const fetchProps = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/properties', { params: { search: search.value, tipoOperacion: filtroTipo.value, estado: filtroEstado.value } });
    const d = data.data || data;
    propiedades.value = d.data || d;
    total.value = d.total || propiedades.value.length;
  } finally { loading.value = false; }
};

const fetchPropietarios = async () => {
  const { data } = await api.get('/clients', { params: { tipo: 'PROPIETARIO', limit: 200 } });
  const d = data.data || data; propietarios.value = d.data || d;
};

const openModal = async (p) => {
  await fetchPropietarios();
  editando.value = p;
  form.value = p ? { ...p, propietarioId: p.propietarioId || '' } : defaultForm();
  formError.value = '';
  modal.value = true;
};

const guardar = async () => {
  if (!form.value.propietarioId) {
    formError.value = 'Seleccioná un propietario.';
    return;
  }
  saving.value = true; formError.value = '';
  try {
    if (editando.value) await api.put(`/properties/${editando.value.id}`, form.value);
    else await api.post('/properties', form.value);
    modal.value = false;
    fetchProps();
  } catch (e) {
    const msg = e.response?.data?.message;
    formError.value = Array.isArray(msg) ? msg.join(' · ') : (e.response?.data?.error || msg || 'Error al guardar');
  }
  finally { saving.value = false; }
};

const crearPropietario = async () => {
  savingPropietario.value = true; errorPropietario.value = '';
  try {
    const { data } = await api.post('/clients', { ...formPropietario.value, tipo: 'PROPIETARIO', estado: 'ACTIVO' });
    const nuevo = data.data || data;
    propietarios.value.push(nuevo);
    form.value.propietarioId = nuevo.id;
    modalNuevoPropietario.value = false;
    formPropietario.value = { nombre: '', apellido: '', email: '', telefono: '' };
  } catch (e) { errorPropietario.value = e.response?.data?.error || 'Error al crear propietario'; }
  finally { savingPropietario.value = false; }
};

const eliminar = async (p) => {
  if (!confirm(`¿Eliminar "${p.titulo}"?`)) return;
  await api.delete(`/properties/${p.id}`);
  fetchProps();
};

onMounted(fetchProps);
</script>
