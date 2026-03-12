<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText :size="24" class="text-primary-500" /> Facturas a clientes (AFIP)
        </h1>
        <p class="text-gray-500 text-sm mt-1">Comprobantes fiscales electrónicos para clientes</p>
      </div>
      <button @click="openModal()" class="btn-primary flex items-center gap-2">
        <Plus :size="18" /> Nueva factura
      </button>
    </div>

    <div class="card p-4 mb-5 flex gap-3 flex-wrap">
      <select v-model="filtroCliente" @change="fetchFacturas" class="input w-56">
        <option value="">Todos los clientes</option>
        <option v-for="c in clientesConFactura" :key="c.id" :value="c.id">{{ c.nombre }} {{ c.apellido }}</option>
      </select>
      <select v-model="filtroEstado" @change="fetchFacturas" class="input w-40">
        <option value="">Todos los estados</option>
        <option value="BORRADOR">Borrador</option>
        <option value="PENDIENTE_AFIP">Pendiente AFIP</option>
        <option value="AUTORIZADA">Autorizada</option>
        <option value="RECHAZADA">Rechazada</option>
      </select>
    </div>

    <div class="card overflow-hidden">
      <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr class="text-left text-xs text-gray-500">
            <th class="px-5 py-3 font-medium">Código</th>
            <th class="px-5 py-3 font-medium">Cliente</th>
            <th class="px-5 py-3 font-medium">Tipo</th>
            <th class="px-5 py-3 font-medium">Fecha</th>
            <th class="px-5 py-3 font-medium">Estado</th>
            <th class="px-5 py-3 font-medium text-right">Total</th>
            <th class="px-5 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="f in facturas" :key="f.id" class="hover:bg-gray-50">
            <td class="px-5 py-4 font-mono text-xs">{{ f.codigo || '—' }}</td>
            <td class="px-5 py-4">{{ f.cliente?.nombre }} {{ f.cliente?.apellido }}</td>
            <td class="px-5 py-4">{{ f.tipoComprobante }}</td>
            <td class="px-5 py-4">{{ formatFecha(f.fechaEmision) }}</td>
            <td class="px-5 py-4"><span :class="estadoClass(f.estado)" class="text-xs px-2.5 py-1 rounded-full">{{ f.estado }}</span></td>
            <td class="px-5 py-4 text-right font-semibold">${{ formatMonto(f.montoTotal) }}</td>
            <td class="px-5 py-4">
              <div class="flex gap-2">
                <button v-if="f.estado === 'BORRADOR'" @click="enviarAfip(f)" class="btn-secondary text-xs text-blue-600">Enviar AFIP</button>
                <button v-if="f.estado === 'BORRADOR'" @click="eliminar(f)" class="btn-secondary text-xs text-red-500">Eliminar</button>
              </div>
            </td>
          </tr>
          <tr v-if="!facturas.length">
            <td colspan="7" class="text-center py-12 text-gray-400">No hay facturas emitidas. Configurá datos fiscales en Clientes y en Datos fiscales.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal nueva factura -->
    <div v-if="modal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Nueva factura</h2>
          <button @click="modal = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <form @submit.prevent="guardar" class="space-y-4">
          <div>
            <label class="label">Cliente (con datos fiscales)</label>
            <select v-model="form.clienteId" class="input" required>
              <option value="">Seleccionar...</option>
              <option v-for="c in clientesConFactura" :key="c.id" :value="c.id">{{ c.nombre }} {{ c.apellido }} {{ c.cuit ? `(${c.cuit})` : '' }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Tipo comprobante</label>
              <select v-model="form.tipoComprobante" class="input" required>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="E">E</option>
                <option value="M">M (MiPyME)</option>
              </select>
            </div>
            <div>
              <label class="label">Punto de venta</label>
              <input v-model.number="form.puntoVenta" type="number" min="1" class="input" required />
            </div>
          </div>
          <div>
            <label class="label">Descripción</label>
            <input v-model="form.descripcion" class="input" placeholder="Honorarios, comisión, etc." />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Monto neto</label>
              <input v-model.number="form.montoNeto" type="number" min="0" step="0.01" class="input" required />
            </div>
            <div>
              <label class="label">IVA</label>
              <input v-model.number="form.montoIva" type="number" min="0" step="0.01" class="input" />
            </div>
          </div>
          <p v-if="formError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ formError }}</p>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modal = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Guardando...' : 'Crear factura' }}</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { FileText, Plus, X } from 'lucide-vue-next';
import api from '../../services/api.js';

const facturas = ref([]);
const clientesConFactura = ref([]);
const loading = ref(true);
const modal = ref(false);
const saving = ref(false);
const formError = ref('');
const filtroCliente = ref('');
const filtroEstado = ref('');

const form = ref({
  clienteId: '', tipoComprobante: 'B', puntoVenta: 1,
  descripcion: '', montoNeto: 0, montoIva: 0,
});

const estadoClass = (e) => ({
  BORRADOR: 'badge-gray',
  PENDIENTE_AFIP: 'badge-yellow',
  AUTORIZADA: 'badge-green',
  RECHAZADA: 'badge-red',
}[e] || 'badge-gray');

const formatFecha = (d) => d ? new Date(d).toLocaleDateString('es-AR') : '—';
const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR');

const fetchFacturas = async () => {
  loading.value = true;
  try {
    const params = {};
    if (filtroCliente.value) params.clienteId = filtroCliente.value;
    if (filtroEstado.value) params.estado = filtroEstado.value;
    const { data } = await api.get('/facturas-emitidas', { params });
    facturas.value = data.data || data;
  } finally { loading.value = false; }
};

const fetchClientes = async () => {
  const { data } = await api.get('/clients', { params: { limit: 500 } });
  const d = data.data || data;
  const lista = d.data || d;
  clientesConFactura.value = lista.filter(c => c.requiereFactura || c.cuit);
};

const openModal = async () => {
  await fetchClientes();
  form.value = { clienteId: '', tipoComprobante: 'B', puntoVenta: 1, descripcion: '', montoNeto: 0, montoIva: 0 };
  formError.value = '';
  modal.value = true;
};

const guardar = async () => {
  saving.value = true; formError.value = '';
  try {
    await api.post('/facturas-emitidas', form.value);
    modal.value = false;
    fetchFacturas();
  } catch (e) {
    formError.value = e.response?.data?.error || e.response?.data?.message || 'Error al crear';
  } finally { saving.value = false; }
};

const enviarAfip = async (f) => {
  try {
    await api.post(`/facturas-emitidas/${f.id}/enviar-afip`);
    fetchFacturas();
  } catch (e) {
    alert(e.response?.data?.error || 'Error');
  }
};

const eliminar = async (f) => {
  if (!confirm('¿Eliminar esta factura?')) return;
  await api.delete(`/facturas-emitidas/${f.id}`);
  fetchFacturas();
};

onMounted(() => { fetchFacturas(); fetchClientes(); });
</script>
