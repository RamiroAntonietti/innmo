<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
      <DollarSign :size="24" class="text-primary-500" /> Cobros pendientes
    </h1>
    <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
    <div v-else class="space-y-3">
      <div v-for="p in pagos" :key="p.id" class="card p-5 flex items-center justify-between">
        <div>
          <p class="font-mono text-xs text-gray-500 mb-0.5">{{ p.codigo || '—' }}</p>
          <p class="font-semibold text-gray-900">{{ p.contrato?.inquilino?.nombre }} {{ p.contrato?.inquilino?.apellido }}</p>
          <p class="text-sm text-gray-500">{{ p.contrato?.propiedad?.titulo }}</p>
          <p class="text-xs text-gray-400 mt-1">Vence: {{ formatFecha(p.fechaVencimiento) }}
            <span v-if="p.diasAtraso > 0" class="text-red-500 font-medium ml-1">({{ p.diasAtraso }} días atraso)</span>
          </p>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-xl font-bold text-primary-600">${{ formatMonto(p.monto) }}</p>
            <span :class="p.diasAtraso > 0 ? 'badge-red' : 'badge-yellow'">{{ p.estado }}</span>
          </div>
          <button @click="abrirRegistrarPago(p)" class="btn-primary text-sm py-2 px-4 flex items-center gap-2">
            <DollarSign :size="16" /> Registrar pago
          </button>
        </div>
      </div>
      <div v-if="!pagos.length" class="text-center py-12 text-gray-400">No hay cobros pendientes</div>
    </div>

    <!-- Modal registrar pago -->
    <div v-if="modalPago" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Registrar pago</h2>
          <button @click="modalPago = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <div v-if="pagoSeleccionado" class="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
          <p class="text-gray-600">{{ pagoSeleccionado.contrato?.propiedad?.titulo }}</p>
          <p class="font-bold text-primary-600 text-lg">${{ formatMonto(pagoSeleccionado.monto) }}</p>
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
              <option value="MERCADOPAGO">Mercado Pago</option>
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
import { DollarSign, X } from 'lucide-vue-next';
import api from '../../services/api.js';

const pagos = ref([]);
const loading = ref(true);
const modalPago = ref(false);
const pagoSeleccionado = ref(null);
const saving = ref(false);
const formError = ref('');
const formPago = ref({ monto: 0, montoPagado: 0, fechaPago: new Date().toISOString().split('T')[0], formaPago: 'EFECTIVO', tipoPago: 'COMPLETO' });

const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—';

const fetchPagos = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/rentals/payments/pending');
    pagos.value = data.data ?? data ?? [];
  } finally {
    loading.value = false;
  }
};

const abrirRegistrarPago = (p) => {
  pagoSeleccionado.value = p;
  formPago.value = {
    monto: parseFloat(p.monto),
    montoPagado: 0,
    fechaPago: new Date().toISOString().split('T')[0],
    formaPago: 'EFECTIVO',
    tipoPago: 'COMPLETO',
  };
  formError.value = '';
  modalPago.value = true;
};

const registrarPago = async () => {
  if (!pagoSeleccionado.value?.contratoId) return;
  saving.value = true;
  formError.value = '';
  try {
    await api.post(`/rentals/${pagoSeleccionado.value.contratoId}/payments`, formPago.value);
    modalPago.value = false;
    pagoSeleccionado.value = null;
    fetchPagos();
  } catch (e) {
    formError.value = e.response?.data?.message || e.response?.data?.error || 'Error al registrar pago';
  } finally {
    saving.value = false;
  }
};

onMounted(fetchPagos);
</script>
