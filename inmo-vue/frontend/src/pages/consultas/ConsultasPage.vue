<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <MessageCircle :size="24" class="text-primary-500" /> Consultas del portal
      </h1>
      <p class="text-gray-500 text-sm mt-1">Mensajes de inquilinos y propietarios</p>
    </div>

    <div v-if="loading" class="text-center py-16 text-gray-400">Cargando...</div>
    <div v-else-if="!consultas.length" class="card p-12 text-center text-gray-500">
      <MessageCircle :size="48" class="mx-auto mb-3 text-gray-300" />
      No hay consultas aún.
    </div>
    <div v-else class="space-y-3">
      <div
        v-for="c in consultas"
        :key="c.id"
        class="card p-5 flex items-start gap-4"
        :class="!c.leido ? 'border-l-4 border-l-primary-500 bg-primary-50/30' : ''"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-gray-900">{{ c.cliente?.nombre }} {{ c.cliente?.apellido }}</span>
            <span :class="c.rol === 'INQUILINO' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'" class="text-xs px-2 py-0.5 rounded-full">{{ c.rol === 'INQUILINO' ? 'Inquilino' : 'Propietario' }}</span>
            <span v-if="c.cliente?.email" class="text-xs text-gray-500">{{ c.cliente.email }}</span>
          </div>
          <p class="text-gray-700 mt-2 whitespace-pre-wrap">{{ c.mensaje }}</p>
          <div v-if="c.respuesta" class="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
            <p class="text-xs font-medium text-green-700 mb-1">Respuesta:</p>
            <p class="text-gray-700 whitespace-pre-wrap">{{ c.respuesta }}</p>
            <p class="text-xs text-gray-500 mt-1">{{ formatFecha(c.respuestaAt) }}</p>
          </div>
          <p class="text-xs text-gray-400 mt-2">{{ formatFecha(c.createdAt) }}</p>
        </div>
        <div class="flex flex-col gap-2 flex-shrink-0">
          <button
            v-if="!c.leido"
            @click="marcarLeido(c)"
            class="btn-secondary text-xs py-2 px-3"
          >
            Marcar leído
          </button>
          <button
            v-if="!c.respuesta"
            @click="abrirResponder(c)"
            class="btn-primary text-xs py-2 px-3 flex items-center gap-1"
          >
            <Send :size="12" /> Responder
          </button>
          <span v-else-if="!c.leido" class="text-xs text-gray-400">Leído</span>
        </div>
      </div>
    </div>

    <!-- Modal responder -->
    <div v-if="modalResponder" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="card w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold">Responder consulta</h2>
          <button @click="cerrarModalResponder" class="p-1.5 hover:bg-gray-100 rounded-lg"><X :size="18" /></button>
        </div>
        <div v-if="consultaSeleccionada" class="space-y-4">
          <p class="text-sm text-gray-600">{{ consultaSeleccionada.cliente?.nombre }} {{ consultaSeleccionada.cliente?.apellido }}</p>
          <p class="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">{{ consultaSeleccionada.mensaje }}</p>
          <form @submit.prevent="enviarRespuesta" class="space-y-4">
            <div>
              <label class="label">Respuesta</label>
              <textarea v-model="formRespuesta.respuesta" rows="4" class="input w-full resize-none" placeholder="Escribí tu respuesta..." required />
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="formRespuesta.enviarEmail" type="checkbox" class="rounded" />
              <span class="text-sm">Enviar también por email a {{ consultaSeleccionada.cliente?.email || '—' }}</span>
            </label>
            <p v-if="errorRespuesta" class="text-sm text-red-600">{{ errorRespuesta }}</p>
            <div class="flex gap-2">
              <button type="button" @click="cerrarModalResponder" class="btn-secondary flex-1">Cancelar</button>
              <button type="submit" :disabled="savingRespuesta" class="btn-primary flex-1">{{ savingRespuesta ? 'Enviando...' : 'Enviar respuesta' }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { MessageCircle, Send, X } from 'lucide-vue-next';
import api from '../../services/api.js';

const consultas = ref([]);
const loading = ref(true);
const modalResponder = ref(false);
const consultaSeleccionada = ref(null);
const formRespuesta = ref({ respuesta: '', enviarEmail: true });
const savingRespuesta = ref(false);
const errorRespuesta = ref('');

const formatFecha = (f) => (f ? new Date(f).toLocaleString('es-AR') : '—');

const fetchConsultas = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/consultas');
    consultas.value = data || [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const marcarLeido = async (c) => {
  try {
    await api.patch(`/consultas/${c.id}/leido`);
    c.leido = true;
  } catch (e) {
    console.error(e);
  }
};

const abrirResponder = (c) => {
  consultaSeleccionada.value = c;
  formRespuesta.value = { respuesta: '', enviarEmail: !!c.cliente?.email };
  errorRespuesta.value = '';
  modalResponder.value = true;
};

const cerrarModalResponder = () => {
  modalResponder.value = false;
  consultaSeleccionada.value = null;
  fetchConsultas();
};

const enviarRespuesta = async () => {
  if (!consultaSeleccionada.value?.id) return;
  const msg = formRespuesta.value.respuesta?.trim();
  if (!msg) {
    errorRespuesta.value = 'La respuesta no puede estar vacía.';
    return;
  }
  savingRespuesta.value = true;
  errorRespuesta.value = '';
  try {
    await api.patch(`/consultas/${consultaSeleccionada.value.id}/responder`, {
      respuesta: msg,
      enviarEmail: formRespuesta.value.enviarEmail,
    });
    cerrarModalResponder();
  } catch (e) {
    errorRespuesta.value = e.response?.data?.message || 'Error al enviar la respuesta.';
  } finally {
    savingRespuesta.value = false;
  }
};

onMounted(fetchConsultas);
</script>
