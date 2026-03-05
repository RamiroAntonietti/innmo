<template>
  <div class="p-8">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <FileText :size="24" class="text-primary-500" /> Alquileres
      </h1>
      <button @click="openModal(null)" class="btn-primary flex items-center gap-2">
        <Plus :size="18" /> Nuevo contrato
      </button>
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
    <div v-else class="space-y-4">
      <div v-for="c in contratos" :key="c.id" class="card p-5">
        <div class="flex items-start justify-between mb-3">
          <div>
            <p class="font-semibold text-gray-900">{{ c.propiedad?.titulo }}</p>
            <p class="text-sm text-gray-500">{{ c.propiedad?.direccion }}</p>
          </div>
          <span :class="estadoClass(c.estado)">{{ c.estado }}</span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div><p class="text-xs text-gray-400">Inquilino</p><p class="font-medium">{{ c.inquilino?.nombre }} {{ c.inquilino?.apellido }}</p></div>
          <div><p class="text-xs text-gray-400">Monto mensual</p><p class="font-bold text-primary-600">${{ formatMonto(c.montoMensual) }}</p></div>
          <div><p class="text-xs text-gray-400">Vigencia</p><p class="font-medium text-gray-700">{{ formatFecha(c.fechaInicio) }} — {{ formatFecha(c.fechaFin) }}</p></div>
          <div v-if="c.tipoAjuste"><p class="text-xs text-gray-400">Ajuste</p><p class="font-medium text-blue-600">{{ c.tipoAjuste }} c/{{ c.frecuenciaAjuste }}m</p></div>
        </div>
        <div class="flex gap-2 flex-wrap items-center">
          <button v-if="c.estado !== 'ANULADO'" @click="openPago(c)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-green-600">
            <DollarSign :size="12" /> Registrar pago
          </button>
          <button v-if="c.estado !== 'ANULADO'" @click="abrirAjuste(c)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <TrendingUp :size="12" /> Ajuste
          </button>
          <button @click="verPagos(c)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <List :size="12" /> Ver pagos
          </button>
          <button v-if="isAdmin && c.estado !== 'ANULADO'" @click="anularContrato(c)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 text-red-500 ml-auto">
            <Ban :size="12" /> Anular
          </button>
        </div>
      </div>
      <div v-if="!contratos.length" class="text-center py-12 text-gray-400">No hay contratos</div>
    </div>

    <!-- Modal nuevo contrato -->
    <div v-if="modalContrato" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Nuevo contrato</h2>
          <button @click="modalContrato = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <form @submit.prevent="guardarContrato" class="space-y-4">
          <div>
            <label class="label">Propiedad</label>
            <select v-model="formContrato.propiedadId" class="input" required>
              <option value="">Seleccionar propiedad</option>
              <option v-for="p in propiedades" :key="p.id" :value="p.id">{{ p.titulo }} — {{ p.direccion }}</option>
            </select>
          </div>
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="label mb-0">Inquilino</label>
              <button type="button" @click="modalNuevoCliente = true" class="text-xs text-primary-500 hover:underline flex items-center gap-1">
                <UserPlus :size="12" /> Agregar cliente
              </button>
            </div>
            <select v-model="formContrato.inquilinoId" class="input" required>
              <option value="">Seleccionar inquilino</option>
              <option v-for="c in clientesInquilinos" :key="c.id" :value="c.id">{{ c.nombre }} {{ c.apellido }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Fecha inicio</label><input v-model="formContrato.fechaInicio" type="date" class="input" required /></div>
            <div><label class="label">Fecha fin</label><input v-model="formContrato.fechaFin" type="date" class="input" required /></div>
          </div>
          <div><label class="label">Monto mensual</label><input v-model.number="formContrato.montoMensual" type="number" min="0" class="input" required /></div>
          <p v-if="formError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ formError }}</p>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modalContrato = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Guardando...' : 'Crear contrato' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal rápido nuevo cliente -->
    <div v-if="modalNuevoCliente" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Nuevo inquilino</h2>
          <button @click="modalNuevoCliente = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <form @submit.prevent="crearClienteRapido" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">Nombre</label><input v-model="formCliente.nombre" class="input" required /></div>
            <div><label class="label">Apellido</label><input v-model="formCliente.apellido" class="input" required /></div>
          </div>
          <div><label class="label">Email</label><input v-model="formCliente.email" type="email" class="input" /></div>
          <div><label class="label">Teléfono</label><input v-model="formCliente.telefono" class="input" /></div>
          <p v-if="errorCliente" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ errorCliente }}</p>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modalNuevoCliente = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="savingCliente" class="btn-primary flex-1">{{ savingCliente ? 'Creando...' : 'Crear y seleccionar' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal pago -->
    <div v-if="modalPago" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Registrar pago</h2>
          <button @click="modalPago = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <div class="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
          <p class="text-gray-600">{{ contratoSeleccionado?.propiedad?.titulo }}</p>
          <p class="font-bold text-primary-600 text-lg">${{ formatMonto(contratoSeleccionado?.montoMensual) }}</p>
        </div>
        <form @submit.prevent="registrarPago" class="space-y-4">
          <div>
            <label class="label">Tipo de pago</label>
            <div class="flex gap-2">
              <button type="button" @click="formPago.tipoPago = 'COMPLETO'" :class="formPago.tipoPago === 'COMPLETO' ? 'btn-primary' : 'btn-secondary'" class="flex-1 text-sm py-2">Completo</button>
              <button type="button" @click="formPago.tipoPago = 'PARCIAL'" :class="formPago.tipoPago === 'PARCIAL' ? 'btn-primary' : 'btn-secondary'" class="flex-1 text-sm py-2">Parcial</button>
            </div>
          </div>
          <div><label class="label">Monto</label><input v-model.number="formPago.monto" type="number" min="0" class="input" required /></div>
          <div v-if="formPago.tipoPago === 'PARCIAL'"><label class="label">Monto pagado</label><input v-model.number="formPago.montoPagado" type="number" min="0" class="input" required /></div>
          <div><label class="label">Fecha de pago</label><input v-model="formPago.fechaPago" type="date" class="input" required /></div>
          <div>
            <label class="label">Forma de pago</label>
            <select v-model="formPago.formaPago" class="input">
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="CHEQUE">Cheque</option>
              <option value="TARJETA">Tarjeta</option>
            </select>
          </div>
          <p v-if="formError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ formError }}</p>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modalPago = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Registrando...' : 'Registrar pago' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { FileText, Plus, DollarSign, TrendingUp, List, X, Ban, UserPlus } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth.js';
import api from '../../services/api.js';

const { isAdmin } = useAuthStore();
const contratos = ref([]);
const propiedades = ref([]);
const clientesInquilinos = ref([]);
const loading = ref(true);
const modalContrato = ref(false);
const modalPago = ref(false);
const modalNuevoCliente = ref(false);
const saving = ref(false);
const savingCliente = ref(false);
const formError = ref('');
const errorCliente = ref('');
const contratoSeleccionado = ref(null);

const formContrato = ref({ propiedadId: '', inquilinoId: '', fechaInicio: '', fechaFin: '', montoMensual: 0 });
const formPago = ref({ monto: 0, montoPagado: 0, fechaPago: new Date().toISOString().split('T')[0], formaPago: 'EFECTIVO', tipoPago: 'COMPLETO' });
const formCliente = ref({ nombre: '', apellido: '', email: '', telefono: '' });

const estadoClass = (e) => ({ ACTIVO: 'badge-green', FINALIZADO: 'badge-gray', ATRASADO: 'badge-red', ANULADO: 'badge-gray' }[e] || 'badge-gray');
const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—';

const fetchContratos = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/rentals');
    const d = data.data || data;
    contratos.value = d.data || d;
  } finally { loading.value = false; }
};

const openModal = async () => {
  const [props, clients] = await Promise.all([
    api.get('/properties', { params: { estado: 'DISPONIBLE' } }),
    api.get('/clients', { params: { tipo: 'INQUILINO', limit: 200 } }),
  ]);
  const pd = props.data.data || props.data; propiedades.value = pd.data || pd;
  const cd = clients.data.data || clients.data; clientesInquilinos.value = cd.data || cd;
  formContrato.value = { propiedadId: '', inquilinoId: '', fechaInicio: '', fechaFin: '', montoMensual: 0 };
  formError.value = '';
  modalContrato.value = true;
};

const guardarContrato = async () => {
  saving.value = true; formError.value = '';
  try {
    await api.post('/rentals', formContrato.value);
    modalContrato.value = false;
    fetchContratos();
  } catch (e) { formError.value = e.response?.data?.error || 'Error al guardar'; }
  finally { saving.value = false; }
};

const crearClienteRapido = async () => {
  savingCliente.value = true; errorCliente.value = '';
  try {
    const { data } = await api.post('/clients', { ...formCliente.value, tipo: 'INQUILINO', estado: 'ACTIVO' });
    const nuevo = data.data || data;
    clientesInquilinos.value.push(nuevo);
    formContrato.value.inquilinoId = nuevo.id;
    modalNuevoCliente.value = false;
    formCliente.value = { nombre: '', apellido: '', email: '', telefono: '' };
  } catch (e) { errorCliente.value = e.response?.data?.error || 'Error al crear cliente'; }
  finally { savingCliente.value = false; }
};

const openPago = (c) => {
  contratoSeleccionado.value = c;
  formPago.value = { monto: parseFloat(c.montoMensual), montoPagado: 0, fechaPago: new Date().toISOString().split('T')[0], formaPago: 'EFECTIVO', tipoPago: 'COMPLETO' };
  formError.value = '';
  modalPago.value = true;
};

const registrarPago = async () => {
  saving.value = true; formError.value = '';
  try {
    await api.post(`/rentals/${contratoSeleccionado.value.id}/payments`, formPago.value);
    modalPago.value = false;
    fetchContratos();
  } catch (e) { formError.value = e.response?.data?.error || 'Error al registrar pago'; }
  finally { saving.value = false; }
};

const anularContrato = async (c) => {
  if (!confirm(`¿Anular el contrato de "${c.propiedad?.titulo}"?\nEsta acción no se puede deshacer.`)) return;
  await api.post(`/rentals/${c.id}/anular`);
  fetchContratos();
};

const abrirAjuste = (c) => alert(`Ajuste para contrato ${c.id}`);
const verPagos = (c) => alert(`Ver pagos de ${c.propiedad?.titulo}`);

onMounted(fetchContratos);
</script>
