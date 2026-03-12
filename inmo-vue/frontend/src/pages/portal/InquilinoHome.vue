<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Mi alquiler</h1>
      <p class="text-gray-500 text-sm mt-1">Hola, {{ portalAuth.user?.nombre }}</p>
      <div v-if="mpResult" :class="mpResultClass" class="mt-3 p-4 rounded-xl flex items-center gap-2">
        <CheckCircle v-if="mpResult === 'success'" :size="20" />
        <XCircle v-else-if="mpResult === 'failure'" :size="20" />
        <Clock v-else :size="20" />
        <span>{{ mpResultMessage }}</span>
      </div>
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
    <div v-else class="space-y-6">
      <!-- Contrato activo -->
      <div v-if="contrato" class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText :size="20" class="text-primary-500" /> Contrato activo
        </h2>
        <div class="grid gap-3">
          <p><span class="text-gray-500">Propiedad:</span> {{ contrato.propiedad?.titulo }}</p>
          <p><span class="text-gray-500">Dirección:</span> {{ contrato.propiedad?.direccion }}, {{ contrato.propiedad?.ciudad }}</p>
          <p><span class="text-gray-500">Monto mensual:</span> <strong class="text-primary-600">${{ formatMonto(contrato.montoMensual) }}</strong></p>
          <p><span class="text-gray-500">Vigencia:</span> {{ formatFecha(contrato.fechaInicio) }} — {{ formatFecha(contrato.fechaFin) }}</p>
          <p><span class="text-gray-500">Próximo vencimiento:</span> {{ proximoVencimiento }}</p>
        </div>
      </div>
      <div v-else class="card p-6 text-center text-gray-500">
        No tenés un contrato activo.
      </div>

      <!-- Deuda pendiente -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle :size="20" class="text-amber-500" /> Deuda pendiente
        </h2>
        <div v-if="deuda?.items?.length" class="space-y-3">
          <div v-for="item in deuda.items" :key="item.id" class="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
            <div>
              <span class="font-medium">{{ item.propiedad }}</span>
              <span v-if="item.codigo" class="text-xs text-gray-400 ml-2">({{ item.codigo }})</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-semibold">${{ formatMonto(item.monto) }}</span>
              <button
                @click="pagarConMercadoPago(item)"
                :disabled="pagandoId === item.id"
                class="btn-primary text-xs py-2 px-4 flex items-center gap-2"
              >
                <CreditCard :size="14" />
                {{ pagandoId === item.id ? 'Redirigiendo...' : 'Pagar con Mercado Pago' }}
              </button>
            </div>
          </div>
          <p class="text-lg font-bold text-gray-900 pt-2">Total: ${{ formatMonto(deuda.total) }}</p>
        </div>
        <p v-else class="text-gray-500">No tenés deuda pendiente.</p>
      </div>

      <!-- Enviar consulta -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageCircle :size="20" class="text-primary-500" /> Dejá tu consulta
        </h2>
        <form @submit.prevent="enviarConsulta" class="space-y-3">
          <textarea
            v-model="consultaMensaje"
            placeholder="Escribí tu consulta o mensaje para la inmobiliaria..."
            rows="3"
            class="input w-full resize-none"
            :disabled="enviandoConsulta"
          />
          <button type="submit" class="btn-primary" :disabled="!consultaMensaje?.trim() || enviandoConsulta">
            {{ enviandoConsulta ? 'Enviando...' : 'Enviar consulta' }}
          </button>
        </form>
        <p v-if="consultaEnviada" class="mt-3 text-sm text-green-600">Consulta enviada. Te responderemos a la brevedad.</p>
      </div>

      <!-- Mis consultas (con respuestas) -->
      <div v-if="misConsultas?.length" class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageCircle :size="20" class="text-primary-500" /> Mis consultas
        </h2>
        <div class="space-y-3">
          <div v-for="c in misConsultas" :key="c.id" class="p-4 rounded-xl border" :class="c.respuesta ? 'bg-green-50/50 border-green-100' : 'bg-gray-50 border-gray-100'">
            <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ c.mensaje }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ formatFecha(c.createdAt) }}</p>
            <div v-if="c.respuesta" class="mt-3 pt-3 border-t border-green-100">
              <p class="text-xs font-medium text-green-700 mb-1">Respuesta:</p>
              <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ c.respuesta }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ formatFecha(c.respuestaAt) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Historial de pagos -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign :size="20" class="text-green-500" /> Historial de pagos
        </h2>
        <div v-if="pagos?.length" class="space-y-2">
          <div v-for="p in pagos" :key="p.id" class="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
            <div>
              <p class="font-medium">{{ p.propiedad }}</p>
              <p class="text-xs text-gray-500">{{ formatFecha(p.fechaPago) }} · {{ p.formaPago || '—' }}</p>
            </div>
            <div class="text-right">
              <span class="font-semibold text-green-600">${{ formatMonto(p.montoPagado || p.monto) }}</span>
              <span :class="estadoBadge(p.estado)" class="ml-2 text-xs px-2 py-0.5 rounded-full">{{ p.estado }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500">No hay pagos registrados.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { FileText, AlertCircle, DollarSign, CreditCard, CheckCircle, XCircle, Clock, MessageCircle } from 'lucide-vue-next';
import { usePortalAuthStore } from '../../stores/portalAuth.js';
import apiPortal from '../../services/apiPortal.js';

const route = useRoute();
const portalAuth = usePortalAuthStore();
const contrato = ref(null);
const deuda = ref(null);
const pagos = ref([]);
const loading = ref(true);
const pagandoId = ref(null);
const consultaMensaje = ref('');
const enviandoConsulta = ref(false);
const consultaEnviada = ref(false);
const misConsultas = ref([]);

const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
const formatFecha = (f) => (f ? new Date(f).toLocaleDateString('es-AR') : '—');

const proximoVencimiento = computed(() => {
  if (!contrato.value?.fechaFin) return '—';
  return formatFecha(contrato.value.fechaFin);
});

const mpResult = ref(null);
const mpResultMessage = computed(() => ({
  success: '¡Pago aprobado! Se actualizará en breve.',
  failure: 'El pago no pudo completarse. Intentá nuevamente.',
  pending: 'El pago está pendiente. Te notificaremos cuando se acredite.',
}[mpResult.value] || ''));
const mpResultClass = computed(() => ({
  success: 'bg-green-50 text-green-800 border border-green-200',
  failure: 'bg-red-50 text-red-800 border border-red-200',
  pending: 'bg-amber-50 text-amber-800 border border-amber-200',
}[mpResult.value] || ''));

const estadoBadge = (e) => ({
  PAGADO: 'bg-green-100 text-green-700',
  PENDIENTE: 'bg-amber-100 text-amber-700',
  ATRASADO: 'bg-red-100 text-red-700',
  PARCIAL: 'bg-blue-100 text-blue-700',
}[e] || 'bg-gray-100 text-gray-600');

const enviarConsulta = async () => {
  const msg = consultaMensaje.value?.trim();
  if (!msg) return;
  enviandoConsulta.value = true;
  consultaEnviada.value = false;
  try {
    await apiPortal.post('/portal/enviar-consulta', { mensaje: msg });
    consultaMensaje.value = '';
    consultaEnviada.value = true;
    const { data } = await apiPortal.get('/portal/mis-consultas');
    misConsultas.value = data || [];
  } catch (e) {
    alert(e.response?.data?.message || 'Error al enviar la consulta.');
  } finally {
    enviandoConsulta.value = false;
  }
};

const pagarConMercadoPago = async (item) => {
  pagandoId.value = item.id;
  try {
    const { data } = await apiPortal.post('/portal/pago-mp/crear-preferencia', { pagoId: item.id });
    if (data?.initPoint) {
      window.location.href = data.initPoint;
    } else {
      alert('Mercado Pago no está configurado. Contactá a tu inmobiliaria.');
    }
  } catch (e) {
    alert(e.response?.data?.message || 'Error al iniciar el pago.');
  } finally {
    pagandoId.value = null;
  }
};

onMounted(async () => {
  const mp = route.query.mp;
  if (mp && ['success', 'failure', 'pending'].includes(mp)) {
    mpResult.value = mp;
    window.history.replaceState({}, '', '/portal/inquilino');
  }
  try {
    const [c, d, p, consultas] = await Promise.all([
      apiPortal.get('/portal/mi-contrato'),
      apiPortal.get('/portal/mi-deuda'),
      apiPortal.get('/portal/mis-pagos'),
      apiPortal.get('/portal/mis-consultas'),
    ]);
    contrato.value = c.data;
    deuda.value = d.data;
    pagos.value = p.data || [];
    misConsultas.value = consultas.data || [];
  } finally {
    loading.value = false;
  }
});
</script>
