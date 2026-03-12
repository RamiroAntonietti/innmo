<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText :size="24" class="text-primary-500" /> Presupuestos
        </h1>
        <p class="text-gray-500 text-sm mt-1">{{ total }} presupuestos</p>
      </div>
      <button @click="openModal(null)" class="btn-primary flex items-center gap-2">
        <Plus :size="18" /> Nuevo presupuesto
      </button>
    </div>

    <div class="card p-4 mb-5 flex gap-3 flex-wrap">
      <select v-model="filtroEstado" @change="fetchPresupuestos" class="input w-40">
        <option value="">Todos los estados</option>
        <option v-for="e in estados" :key="e" :value="e">{{ e }}</option>
      </select>
      <select v-model="filtroTipo" @change="fetchPresupuestos" class="input w-40">
        <option value="">Todos los tipos</option>
        <option value="ALQUILER">Alquiler</option>
        <option value="VENTA">Venta</option>
      </select>
    </div>

    <div class="space-y-4">
      <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
      <div v-else v-for="p in presupuestos" :key="p.id" class="card p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <p class="font-mono text-xs text-gray-500 mb-0.5">{{ p.codigo || '—' }}</p>
            <p class="font-semibold text-gray-900">{{ p.cliente?.nombre }} {{ p.cliente?.apellido }}</p>
            <p class="text-sm text-gray-500 mt-0.5">{{ p.propiedades?.length || 0 }} propiedad(es) · Vigencia hasta {{ formatFecha(p.vigenciaHasta) }}</p>
            <div class="flex flex-wrap gap-2 mt-2">
              <span :class="estadoClass(p.estado)" class="text-xs px-2 py-0.5 rounded-full">{{ p.estado }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100">{{ p.tipo }}</span>
            </div>
            <p class="text-lg font-bold text-primary-600 mt-2">${{ formatMonto(p.montoTotal) }}{{ p.tipo === 'ALQUILER' ? '/mes' : '' }}</p>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            <button @click="descargarPDF(p)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Download :size="12" /> PDF
            </button>
            <button @click="openModal(p)" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
              <Pencil :size="12" /> Editar
            </button>
            <button v-if="p.estado === 'ACEPTADO'" @click="abrirConvertir(p)" class="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
              Convertir
            </button>
            <button v-if="isAdmin" @click="eliminar(p)" class="btn-secondary text-xs py-1.5 px-3 text-red-500">
              <Trash2 :size="12" />
            </button>
          </div>
        </div>
        <div v-if="p.propiedades?.length" class="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600">
          <span v-for="(pp, i) in p.propiedades" :key="pp.id">
            {{ pp.propiedad?.titulo }} (${{ formatMonto(pp.monto) }}{{ p.tipo === 'ALQUILER' ? '/mes' : '' }})<span v-if="i < p.propiedades.length - 1"> · </span>
          </span>
        </div>
      </div>
      <div v-if="!loading && !presupuestos.length" class="text-center py-12 text-gray-400">No hay presupuestos</div>
    </div>

    <!-- Modal crear/editar -->
    <div v-if="modal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div class="card w-full max-w-lg p-6 my-4">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">{{ editando ? 'Editar presupuesto' : 'Nuevo presupuesto' }}</h2>
          <button @click="modal = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <form v-if="!editando" @submit.prevent="guardar" class="space-y-4">
          <div>
            <label class="label">Cliente (interesado)</label>
            <select v-model="form.clienteId" class="input" required>
              <option value="">Seleccionar cliente</option>
              <option v-for="c in clientes" :key="c.id" :value="c.id">{{ c.nombre }} {{ c.apellido }} ({{ c.tipo }})</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Tipo</label>
              <select v-model="form.tipo" class="input" required>
                <option value="ALQUILER">Alquiler</option>
                <option value="VENTA">Venta</option>
              </select>
            </div>
            <div>
              <label class="label">Vigencia hasta</label>
              <input v-model="form.vigenciaHasta" type="date" class="input" required />
            </div>
          </div>
          <div>
            <label class="label">Propiedades y montos</label>
            <div v-for="(item, idx) in form.propiedades" :key="idx" class="flex gap-2 mb-2">
              <select v-model="item.propiedadId" class="input flex-1" required>
                <option value="">Seleccionar propiedad</option>
                <option v-for="prop in propiedades" :key="prop.id" :value="prop.id" :disabled="form.propiedades.some((x, i) => i !== idx && x.propiedadId === prop.id)">
                  {{ prop.titulo }} — ${{ formatMonto(prop.precio) }}{{ prop.tipoOperacion === 'ALQUILER' ? '/mes' : '' }}
                </option>
              </select>
              <input v-model.number="item.monto" type="number" min="0.01" step="0.01" class="input w-28" placeholder="Monto" required />
              <button v-if="form.propiedades.length > 1" type="button" @click="form.propiedades.splice(idx, 1)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                <Trash2 :size="14" />
              </button>
            </div>
            <button type="button" @click="form.propiedades.push({ propiedadId: '', monto: 0 })" class="btn-secondary text-xs mt-2">
              + Agregar propiedad
            </button>
          </div>
          <div>
            <label class="label">Monto total</label>
            <input v-model.number="form.montoTotal" type="number" min="0.01" step="0.01" class="input" required />
          </div>
          <div>
            <label class="label">Notas</label>
            <textarea v-model="form.notas" class="input h-16 resize-none" />
          </div>
          <p v-if="formError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ formError }}</p>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modal = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
          </div>
        </form>
        <form v-else @submit.prevent="guardarEstado" class="space-y-4">
          <div>
            <label class="label">Estado</label>
            <select v-model="formEdit.estado" class="input">
              <option v-for="e in estados" :key="e" :value="e">{{ e }}</option>
            </select>
          </div>
          <div>
            <label class="label">Notas</label>
            <textarea v-model="formEdit.notas" class="input h-16 resize-none" />
          </div>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modal = false" class="btn-secondary flex-1">Cancelar</button>
            <button type="submit" :disabled="saving" class="btn-primary flex-1">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal convertir -->
    <div v-if="modalConvertir" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Convertir presupuesto</h2>
          <button @click="modalConvertir = false" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <div v-if="presupuestoConvertir" class="space-y-4">
          <p class="text-sm text-gray-600">{{ presupuestoConvertir.cliente?.nombre }} {{ presupuestoConvertir.cliente?.apellido }} — {{ presupuestoConvertir.tipo }}</p>
          <div>
            <label class="label">Propiedad a convertir</label>
            <select v-model="formConvertir.propiedadId" class="input" required>
              <option value="">Seleccionar</option>
              <option v-for="pp in presupuestoConvertir.propiedades" :key="pp.propiedadId" :value="pp.propiedadId">
                {{ pp.propiedad?.titulo }} — ${{ formatMonto(pp.monto) }}{{ presupuestoConvertir.tipo === 'ALQUILER' ? '/mes' : '' }}
              </option>
            </select>
          </div>
          <template v-if="presupuestoConvertir.tipo === 'ALQUILER'">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">Fecha inicio</label><input v-model="formConvertir.fechaInicio" type="date" class="input" required /></div>
              <div><label class="label">Fecha fin</label><input v-model="formConvertir.fechaFin" type="date" class="input" required /></div>
            </div>
            <div>
              <label class="label">Monto mensual</label>
              <input v-model.number="formConvertir.montoMensual" type="number" min="1" class="input" required />
            </div>
            <div>
              <label class="label">Depósito (opcional)</label>
              <input v-model.number="formConvertir.deposito" type="number" min="0" class="input" />
            </div>
          </template>
          <template v-else>
            <div><label class="label">Precio final</label><input v-model.number="formConvertir.precioFinal" type="number" min="0.01" class="input" required /></div>
            <div><label class="label">Comisión</label><input v-model.number="formConvertir.comision" type="number" min="0" class="input" required /></div>
          </template>
          <p v-if="errorConvertir" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ errorConvertir }}</p>
          <div class="flex gap-3 pt-2">
            <button type="button" @click="modalConvertir = false" class="btn-secondary flex-1">Cancelar</button>
            <button @click="convertir" :disabled="savingConvertir" class="btn-primary flex-1">{{ savingConvertir ? 'Procesando...' : 'Convertir' }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { FileText, Plus, Pencil, Trash2, X, Download } from 'lucide-vue-next';
import { useAuthStore } from '../../stores/auth.js';
import api from '../../services/api.js';
import { addLogoToPdf } from '../../composables/usePdfLogo.js';

const route = useRoute();

const { isAdmin } = useAuthStore();
const presupuestos = ref([]);
const clientes = ref([]);
const propiedades = ref([]);
const total = ref(0);
const loading = ref(true);
const modal = ref(false);
const modalConvertir = ref(false);
const editando = ref(null);
const presupuestoConvertir = ref(null);
const saving = ref(false);
const savingConvertir = ref(false);
const formError = ref('');
const errorConvertir = ref('');
const filtroEstado = ref('');
const filtroTipo = ref('');
const estados = ['BORRADOR', 'ENVIADO', 'ACEPTADO', 'RECHAZADO'];

const form = ref({
  clienteId: '',
  tipo: 'ALQUILER',
  montoTotal: 0,
  vigenciaHasta: '',
  propiedades: [{ propiedadId: '', monto: 0 }],
  notas: '',
});

const formEdit = ref({ estado: 'BORRADOR', notas: '' });

const formConvertir = ref({
  propiedadId: '',
  fechaInicio: '',
  fechaFin: '',
  montoMensual: 0,
  deposito: null,
  precioFinal: 0,
  comision: 0,
});

const estadoClass = (e) => ({ BORRADOR: 'bg-gray-100 text-gray-700', ENVIADO: 'bg-blue-100 text-blue-700', ACEPTADO: 'bg-green-100 text-green-700', RECHAZADO: 'bg-red-100 text-red-700' }[e] || '');
const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—';

const fetchPresupuestos = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/presupuestos', { params: { estado: filtroEstado.value, tipo: filtroTipo.value } });
    const d = data.data || data;
    presupuestos.value = d.data || d;
    total.value = d.total ?? presupuestos.value.length;
  } finally {
    loading.value = false;
  }
};

const fetchClientes = async () => {
  const { data } = await api.get('/clients', { params: { limit: 500 } });
  const d = data.data || data;
  clientes.value = d.data || d;
};

const fetchPropiedades = async () => {
  const { data } = await api.get('/properties', { params: { limit: 200 } });
  const d = data.data || data;
  propiedades.value = d.data || d;
};

const openModal = async (p) => {
  await Promise.all([fetchClientes(), fetchPropiedades()]);
  editando.value = p;
  if (p) {
    formEdit.value = { estado: p.estado, notas: p.notas || '' };
  } else {
    const hoy = new Date();
    hoy.setMonth(hoy.getMonth() + 1);
    form.value = {
      clienteId: '',
      tipo: 'ALQUILER',
      montoTotal: 0,
      vigenciaHasta: hoy.toISOString().slice(0, 10),
      propiedades: [{ propiedadId: '', monto: 0 }],
      notas: '',
    };
  }
  formError.value = '';
  modal.value = true;
};

const guardar = async () => {
  const props = form.value.propiedades.filter(x => x.propiedadId && x.monto > 0);
  if (!props.length) {
    formError.value = 'Agregá al menos una propiedad con monto.';
    return;
  }
  const montoTotal = props.reduce((s, x) => s + x.monto, 0);
  saving.value = true;
  formError.value = '';
  try {
    await api.post('/presupuestos', {
      clienteId: form.value.clienteId,
      tipo: form.value.tipo,
      montoTotal: form.value.montoTotal || montoTotal,
      vigenciaHasta: form.value.vigenciaHasta,
      propiedades: props,
      notas: form.value.notas,
    });
    modal.value = false;
    fetchPresupuestos();
  } catch (e) {
    formError.value = e.response?.data?.message || e.response?.data?.error || 'Error al guardar';
  } finally {
    saving.value = false;
  }
};

const guardarEstado = async () => {
  saving.value = true;
  try {
    await api.put(`/presupuestos/${editando.value.id}`, formEdit.value);
    modal.value = false;
    fetchPresupuestos();
  } catch (e) {
    formError.value = e.response?.data?.message || e.response?.data?.error || 'Error al guardar';
  } finally {
    saving.value = false;
  }
};

const abrirConvertir = (p) => {
  presupuestoConvertir.value = p;
  const pp = p.propiedades?.[0];
  formConvertir.value = {
    propiedadId: pp?.propiedadId || '',
    fechaInicio: '',
    fechaFin: '',
    montoMensual: pp ? parseFloat(pp.monto) : 0,
    deposito: null,
    precioFinal: pp ? parseFloat(pp.monto) : 0,
    comision: 0,
  };
  errorConvertir.value = '';
  modalConvertir.value = true;
};

const convertir = async () => {
  if (!presupuestoConvertir.value?.id) return;
  savingConvertir.value = true;
  errorConvertir.value = '';
  try {
    if (presupuestoConvertir.value.tipo === 'ALQUILER') {
      await api.post(`/presupuestos/${presupuestoConvertir.value.id}/convertir-alquiler`, {
        propiedadId: formConvertir.value.propiedadId,
        fechaInicio: formConvertir.value.fechaInicio,
        fechaFin: formConvertir.value.fechaFin,
        montoMensual: formConvertir.value.montoMensual,
        deposito: formConvertir.value.deposito || undefined,
      });
      window.location.href = '/app/rentals';
    } else {
      await api.post(`/presupuestos/${presupuestoConvertir.value.id}/convertir-venta`, {
        propiedadId: formConvertir.value.propiedadId,
        precioFinal: formConvertir.value.precioFinal,
        comision: formConvertir.value.comision,
      });
      modalConvertir.value = false;
      fetchPresupuestos();
    }
  } catch (e) {
    errorConvertir.value = e.response?.data?.message || e.response?.data?.error || 'Error al convertir';
  } finally {
    savingConvertir.value = false;
  }
};

const descargarPDF = async (p) => {
  try {
    const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const margen = 20;
    const ancho = 210 - margen * 2;
    let y = margen;

    // Logo arriba a la izquierda
    y = await addLogoToPdf(pdf, null, { x: margen, y: margen - 4, maxWidth: 20, maxHeight: 20 });
    y += 6;

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PRESUPUESTO', margen, y);
    y += 8;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Código: ${p.codigo || '—'}`, margen, y);
    y += 6;
    pdf.text(`Cliente: ${p.cliente?.nombre} ${p.cliente?.apellido}`, margen, y);
    y += 6;
    pdf.text(`Tipo: ${p.tipo} · Vigencia hasta: ${formatFecha(p.vigenciaHasta)}`, margen, y);
    y += 6;
    pdf.text(`Monto total: $${formatMonto(p.montoTotal)}${p.tipo === 'ALQUILER' ? '/mes' : ''}`, margen, y);
    y += 10;

    if (p.propiedades?.length) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Propiedades:', margen, y);
      y += 6;
      pdf.setFont('helvetica', 'normal');
      p.propiedades.forEach(pp => {
        pdf.text(`• ${pp.propiedad?.titulo || '—'} — $${formatMonto(pp.monto)}${p.tipo === 'ALQUILER' ? '/mes' : ''}`, margen, y);
        y += 5;
      });
      y += 4;
    }

    if (p.notas) {
      pdf.text('Notas: ' + p.notas, margen, y);
    }

    pdf.save(`presupuesto-${p.codigo || p.id}.pdf`);
  } catch (e) {
    console.error(e);
    alert('Error al generar PDF');
  }
};

const eliminar = async (p) => {
  if (!confirm(`¿Eliminar presupuesto de ${p.cliente?.nombre} ${p.cliente?.apellido}?`)) return;
  await api.delete(`/presupuestos/${p.id}`);
  fetchPresupuestos();
};

onMounted(async () => {
  await fetchPresupuestos();
  const propId = route.query.propiedadId;
  const cliId = route.query.clienteId;
  if (propId || cliId) {
    await Promise.all([fetchClientes(), fetchPropiedades()]);
    const prop = propId ? propiedades.value.find(x => x.id === propId) : null;
    const hoy = new Date();
    hoy.setMonth(hoy.getMonth() + 1);
    const monto = prop ? parseFloat(prop.precio) : 0;
    form.value = {
      clienteId: cliId || '',
      tipo: prop?.tipoOperacion || 'ALQUILER',
      montoTotal: monto,
      vigenciaHasta: hoy.toISOString().slice(0, 10),
      propiedades: propId ? [{ propiedadId: propId, monto }] : [{ propiedadId: '', monto: 0 }],
      notas: '',
    };
    editando.value = null;
    modal.value = true;
  }
});
</script>
