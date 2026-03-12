<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Mis propiedades</h1>
      <p class="text-gray-500 text-sm mt-1">Hola, {{ portalAuth.user?.nombre }}</p>
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
    <div v-else class="space-y-6">
      <!-- Propiedades -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 :size="20" class="text-primary-500" /> Mis propiedades
        </h2>
        <div v-if="propiedades?.length" class="grid gap-4 sm:grid-cols-2">
          <div v-for="p in propiedades" :key="p.id" class="border border-gray-100 rounded-xl p-4 hover:border-primary-200 transition-colors">
            <p class="font-mono text-xs text-gray-500 mb-1">{{ p.codigo || '—' }}</p>
            <p class="font-semibold text-gray-900">{{ p.titulo }}</p>
            <p class="text-sm text-gray-500 mt-1">{{ p.direccion }}, {{ p.ciudad }}</p>
            <p class="text-primary-600 font-bold mt-2">${{ formatMonto(p.precio) }}{{ p.tipoOperacion === 'ALQUILER' ? '/mes' : '' }}</p>
            <span :class="estadoBadge(p.estado)" class="inline-block mt-2 text-xs px-2 py-1 rounded-full">{{ p.estado }}</span>
          </div>
        </div>
        <p v-else class="text-gray-500">No tenés propiedades registradas.</p>
      </div>

      <!-- Facturas de servicios -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText :size="20" class="text-blue-500" /> Servicios por propiedad
        </h2>
        <div v-if="facturas?.length" class="space-y-3">
          <div v-for="f in facturas" :key="f.id" class="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
            <div>
              <p class="font-medium">{{ f.propiedad }} — {{ f.tipoServicio }}</p>
              <p class="text-xs text-gray-500">Vence: {{ formatFecha(f.fechaVence) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-semibold">${{ formatMonto(f.monto) }}</span>
              <span :class="estadoFacturaBadge(f.estado)" class="text-xs px-2 py-0.5 rounded-full">{{ estadoFacturaLabel(f.estado) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500">No hay servicios registrados.</p>
      </div>

      <!-- Gastos de la propiedad -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Receipt :size="20" class="text-amber-500" /> Gastos de mis propiedades
        </h2>
        <div v-if="gastos?.length" class="space-y-3">
          <div v-for="g in gastos" :key="g.id" class="py-3 border-b border-gray-100 last:border-0">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium">{{ g.propiedad }} — {{ g.tipo }}</p>
                <p class="text-sm text-gray-600">{{ g.descripcion }}</p>
                <p class="text-xs text-gray-400 mt-1">{{ formatFecha(g.fecha) }} · {{ g.pagadoPor === 'PROPIETARIO' ? 'Propietario' : 'Inmobiliaria' }}</p>
              </div>
              <span class="font-semibold text-gray-900">${{ formatMonto(g.monto) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-gray-500">No hay gastos registrados.</p>
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

      <!-- Liquidaciones / Ingresos -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign :size="20" class="text-green-500" /> Liquidaciones
        </h2>
        <div v-if="liquidaciones?.items?.length" class="space-y-3">
          <div v-for="l in liquidaciones.items" :key="l.id" class="py-3 border-b border-gray-100 last:border-0">
            <div class="flex justify-between items-start">
              <div>
                <p class="font-medium">{{ l.propiedad }}</p>
                <p class="text-xs text-gray-500">{{ formatFecha(l.fechaPago) }}{{ l.codigo ? ` · ${l.codigo}` : '' }}</p>
              </div>
              <div class="text-right">
                <p v-if="l.comision > 0" class="text-xs text-gray-500">
                  Bruto ${{ formatMonto(l.montoBruto) }} − Comisión ${{ formatMonto(l.comision) }}
                </p>
                <p class="font-semibold text-green-600">${{ formatMonto(l.netoPropietario ?? l.monto) }}</p>
              </div>
            </div>
          </div>
          <div class="pt-3 border-t border-gray-200 space-y-1">
            <template v-if="liquidaciones.totalComision > 0">
              <p class="text-sm text-gray-600 flex justify-between"><span>Total bruto</span><span>${{ formatMonto(liquidaciones.totalBruto) }}</span></p>
              <p class="text-sm text-gray-600 flex justify-between"><span>Comisión inmobiliaria ({{ liquidaciones.porcentajeComision }}%)</span><span class="text-amber-600">−${{ formatMonto(liquidaciones.totalComision) }}</span></p>
            </template>
            <p class="text-lg font-bold text-gray-900 flex justify-between pt-1"><span>Total a cobrar</span><span>${{ formatMonto(liquidaciones.totalNeto ?? liquidaciones.total) }}</span></p>
          </div>
        </div>
        <p v-else class="text-gray-500">No hay liquidaciones registradas.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Building2, DollarSign, FileText, Receipt, MessageCircle } from 'lucide-vue-next';
import { usePortalAuthStore } from '../../stores/portalAuth.js';
import apiPortal from '../../services/apiPortal.js';

const portalAuth = usePortalAuthStore();
const propiedades = ref([]);
const facturas = ref([]);
const gastos = ref([]);
const liquidaciones = ref({ items: [], total: 0 });
const loading = ref(true);
const consultaMensaje = ref('');
const enviandoConsulta = ref(false);
const consultaEnviada = ref(false);
const misConsultas = ref([]);

const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
const formatFecha = (f) => (f ? new Date(f).toLocaleDateString('es-AR') : '—');

const estadoBadge = (e) => ({
  DISPONIBLE: 'bg-gray-100 text-gray-600',
  ALQUILADO: 'bg-green-100 text-green-700',
  RESERVADO: 'bg-amber-100 text-amber-700',
  VENDIDO: 'bg-blue-100 text-blue-700',
}[e] || 'bg-gray-100 text-gray-600');

const estadoFacturaBadge = (e) => ({
  PAGADO: 'bg-green-100 text-green-700',
  PENDIENTE: 'bg-amber-100 text-amber-700',
  VENCIDO: 'bg-red-100 text-red-700',
}[e] || 'bg-gray-100 text-gray-600');

const estadoFacturaLabel = (e) => ({
  PAGADO: 'Abonada',
  PENDIENTE: 'Pendiente',
  VENCIDO: 'Vencida',
}[e] || e);

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

onMounted(async () => {
  try {
    const [props, fact, gast, liq, consultas] = await Promise.all([
      apiPortal.get('/portal/mis-propiedades'),
      apiPortal.get('/portal/mis-facturas-servicio'),
      apiPortal.get('/portal/mis-gastos'),
      apiPortal.get('/portal/mis-liquidaciones'),
      apiPortal.get('/portal/mis-consultas'),
    ]);
    propiedades.value = props.data || [];
    facturas.value = fact.data || [];
    gastos.value = gast.data || [];
    liquidaciones.value = liq.data || { items: [], total: 0 };
    misConsultas.value = consultas.data || [];
  } finally {
    loading.value = false;
  }
});
</script>
