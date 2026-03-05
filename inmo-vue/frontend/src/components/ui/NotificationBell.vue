<template>
  <div class="relative" ref="bellRef">
    <button @click="toggle" class="relative p-2 hover:bg-gray-100 rounded-xl transition-colors">
      <Bell :size="20" class="text-gray-600" />
      <span v-if="total > 0"
        class="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
        :class="urgentes > 0 ? 'bg-red-500 text-white' : 'bg-yellow-400 text-white'">
        {{ total > 9 ? '9+' : total }}
      </span>
    </button>

    <!-- Panel -->
    <div v-if="open" class="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
      <div class="p-4 border-b border-gray-100 flex items-center justify-between">
        <p class="font-semibold text-gray-900 text-sm">Notificaciones</p>
        <button @click="fetchNotificaciones" class="text-xs text-primary-500 hover:underline">Actualizar</button>
      </div>
      <div v-if="loading" class="text-center py-6 text-gray-400 text-sm">Cargando...</div>
      <div v-else-if="!items.length" class="text-center py-8 text-gray-400 text-sm">
        <CheckCircle :size="28" class="mx-auto mb-2 text-green-400" />
        Todo al día 🎉
      </div>
      <div v-else class="divide-y divide-gray-50 max-h-72 overflow-y-auto">
        <button
          v-for="item in items" :key="item.tipo"
          @click="navegar(item.ruta)"
          class="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
        >
          <div class="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
            :class="item.urgente ? 'bg-red-100' : 'bg-yellow-100'">
            <AlertCircle :size="14" :class="item.urgente ? 'text-red-500' : 'text-yellow-600'" />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-800">{{ item.mensaje }}</p>
            <p class="text-xs text-primary-500 mt-0.5">Ver →</p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Bell, AlertCircle, CheckCircle } from 'lucide-vue-next';
import api from '../../services/api.js';

const router = useRouter();
const open = ref(false);
const loading = ref(false);
const total = ref(0);
const urgentes = ref(0);
const items = ref([]);
const bellRef = ref(null);

const fetchNotificaciones = async () => {
  loading.value = true;
  try {
    const { data } = await api.get('/dashboard/notificaciones');
    const d = data.data || data;
    total.value = d.total || 0;
    urgentes.value = d.urgentes || 0;
    items.value = d.items || [];
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const toggle = () => {
  open.value = !open.value;
  if (open.value) fetchNotificaciones();
};

const navegar = (ruta) => {
  open.value = false;
  router.push(ruta);
};

const clickFuera = (e) => {
  if (bellRef.value && !bellRef.value.contains(e.target)) open.value = false;
};

onMounted(() => {
  fetchNotificaciones();
  document.addEventListener('click', clickFuera);
  // Refresca cada 2 minutos
  const interval = setInterval(fetchNotificaciones, 120000);
  onUnmounted(() => {
    document.removeEventListener('click', clickFuera);
    clearInterval(interval);
  });
});
</script>
