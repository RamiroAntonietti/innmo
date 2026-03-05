<template>
  <div class="p-8">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.push('/properties')" class="btn-secondary flex items-center gap-2 text-sm">
        <ArrowLeft :size="16" /> Volver
      </button>
      <div class="flex-1">
        <h1 class="text-2xl font-bold text-gray-900">{{ propiedad?.titulo }}</h1>
        <p class="text-gray-500 text-sm">{{ propiedad?.direccion }}, {{ propiedad?.ciudad }}</p>
      </div>
      <span v-if="propiedad" :class="estadoClass(propiedad.estado)" class="text-sm px-3 py-1 rounded-full font-medium">
        {{ propiedad.estado }}
      </span>
      <button @click="openEdit" class="btn-secondary flex items-center gap-2 text-sm">
        <Pencil :size="14" /> Editar
      </button>
    </div>

    <div v-if="loading" class="text-center py-20 text-gray-400">Cargando...</div>

    <div v-else-if="propiedad" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Columna principal -->
      <div class="lg:col-span-2 space-y-5">

        <!-- Galería de imágenes -->
        <div class="card p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-gray-900 flex items-center gap-2"><ImageIcon :size="16" /> Fotos ({{ imagenes.length }}/10)</h2>
            <label v-if="imagenes.length < 10" class="btn-primary text-sm cursor-pointer flex items-center gap-2">
              <Upload :size="14" />
              {{ uploading ? 'Subiendo...' : 'Agregar foto' }}
              <input type="file" accept="image/*" multiple class="hidden" @change="subirImagenes" :disabled="uploading" />
            </label>
          </div>

          <!-- Grid de imágenes -->
          <div v-if="imagenes.length" class="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div v-for="(img, idx) in imagenes" :key="img.id" class="relative group rounded-xl overflow-hidden aspect-video bg-gray-100">
              <img :src="img.url" :alt="img.nombre || 'Foto'" class="w-full h-full object-cover cursor-pointer"
                @click="imagenSeleccionada = idx" />
              <button @click="eliminarImagen(img)"
                class="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X :size="12" />
              </button>
              <span v-if="idx === 0" class="absolute bottom-2 left-2 bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">Principal</span>
            </div>
          </div>
          <div v-else class="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
            <ImageIcon :size="32" class="mx-auto mb-2 opacity-30" />
            <p class="text-sm">Sin fotos. Agregá imágenes para mostrar la propiedad.</p>
          </div>
          <p v-if="uploadError" class="text-xs text-red-500 mt-2">{{ uploadError }}</p>
        </div>

        <!-- Descripción -->
        <div class="card p-5">
          <h2 class="font-semibold text-gray-900 mb-3">Descripción</h2>
          <p class="text-gray-600 text-sm leading-relaxed">{{ propiedad.descripcion || 'Sin descripción.' }}</p>
        </div>

        <!-- Facturas de la propiedad -->
        <div class="card p-5">
          <h2 class="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Zap :size="15" /> Facturas de servicios</h2>
          <div v-if="facturas.length" class="space-y-2">
            <div v-for="f in facturas" :key="f.id" class="flex items-center justify-between text-sm p-3 rounded-xl bg-gray-50"
              :class="esVencida(f) ? 'border border-red-200 bg-red-50' : ''">
              <span>{{ tipoEmoji(f.tipoServicio) }} {{ f.tipoServicio }}</span>
              <span :class="esVencida(f) ? 'text-red-600 font-medium' : 'text-gray-500'">vence {{ formatFecha(f.fechaVence) }}</span>
              <span class="font-semibold">${{ formatMonto(f.monto) }}</span>
              <span :class="estadoFactura(f.estado)" class="text-xs px-2 py-0.5 rounded-full">{{ f.estado }}</span>
            </div>
          </div>
          <p v-else class="text-gray-400 text-sm">Sin facturas registradas.</p>
          <button @click="$router.push('/facturas')" class="btn-secondary text-xs mt-3">Ver todas las facturas →</button>
        </div>
      </div>

      <!-- Panel lateral -->
      <div class="space-y-5">
        <!-- Info principal -->
        <div class="card p-5">
          <h2 class="font-semibold text-gray-900 mb-4">Información</h2>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500">Tipo</span>
              <span class="font-medium">{{ propiedad.tipoOperacion }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Precio</span>
              <span class="font-bold text-primary-600 text-lg">${{ formatMonto(propiedad.precio) }}</span>
            </div>
            <div v-if="propiedad.dormitorios" class="flex justify-between">
              <span class="text-gray-500">🛏 Dormitorios</span>
              <span class="font-medium">{{ propiedad.dormitorios }}</span>
            </div>
            <div v-if="propiedad.banos" class="flex justify-between">
              <span class="text-gray-500">🚿 Baños</span>
              <span class="font-medium">{{ propiedad.banos }}</span>
            </div>
            <div v-if="propiedad.metrosCuadrados" class="flex justify-between">
              <span class="text-gray-500">📐 Superficie</span>
              <span class="font-medium">{{ propiedad.metrosCuadrados }} m²</span>
            </div>
          </div>
        </div>

        <!-- Propietario -->
        <div class="card p-5" v-if="propiedad.propietario">
          <h2 class="font-semibold text-gray-900 mb-3">Propietario</h2>
          <div class="flex items-center gap-3 mb-3">
            <div class="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-sm font-bold text-primary-600">
              {{ propiedad.propietario.nombre?.[0] }}{{ propiedad.propietario.apellido?.[0] }}
            </div>
            <div>
              <p class="font-medium text-gray-900">{{ propiedad.propietario.nombre }} {{ propiedad.propietario.apellido }}</p>
              <p class="text-xs text-gray-400">{{ propiedad.propietario.email }}</p>
            </div>
          </div>
          <p v-if="propiedad.propietario.telefono" class="text-sm text-gray-600 flex items-center gap-2">
            <Phone :size="12" /> {{ propiedad.propietario.telefono }}
          </p>
        </div>

        <!-- Contrato activo -->
        <div class="card p-5" v-if="contratoActivo">
          <h2 class="font-semibold text-gray-900 mb-3">Contrato activo</h2>
          <div class="text-sm space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-500">Inquilino</span>
              <span class="font-medium">{{ contratoActivo.inquilino?.nombre }} {{ contratoActivo.inquilino?.apellido }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Monto</span>
              <span class="font-bold text-green-600">${{ formatMonto(contratoActivo.montoMensual) }}/mes</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500">Vence</span>
              <span class="font-medium">{{ formatFecha(contratoActivo.fechaFin) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox -->
    <div v-if="imagenSeleccionada !== null" class="fixed inset-0 bg-black/90 flex items-center justify-center z-50"
      @click.self="imagenSeleccionada = null">
      <button @click="imagenSeleccionada = null" class="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-xl">
        <X :size="24" />
      </button>
      <button v-if="imagenSeleccionada > 0" @click="imagenSeleccionada--"
        class="absolute left-4 text-white p-3 hover:bg-white/10 rounded-xl">
        <ChevronLeft :size="24" />
      </button>
      <img :src="imagenes[imagenSeleccionada]?.url" class="max-h-[85vh] max-w-[90vw] rounded-xl object-contain" />
      <button v-if="imagenSeleccionada < imagenes.length - 1" @click="imagenSeleccionada++"
        class="absolute right-4 text-white p-3 hover:bg-white/10 rounded-xl">
        <ChevronRight :size="24" />
      </button>
      <p class="absolute bottom-4 text-white/60 text-sm">{{ imagenSeleccionada + 1 }} / {{ imagenes.length }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Pencil, Upload, X, Image as ImageIcon, Zap, Phone, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { createClient } from '@supabase/supabase-js';
import api from '../../services/api.js';
import { useAuthStore } from '../../stores/auth.js';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const propiedad = ref(null);
const imagenes = ref([]);
const facturas = ref([]);
const contratos = ref([]);
const loading = ref(true);
const uploading = ref(false);
const uploadError = ref('');
const imagenSeleccionada = ref(null);

// Supabase client para storage
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const estadoClass = (e) => ({ DISPONIBLE: 'badge-green', RESERVADO: 'badge-yellow', ALQUILADO: 'badge-blue', VENDIDO: 'badge-gray' }[e] || 'badge-gray');
const estadoFactura = (e) => ({ PENDIENTE: 'bg-yellow-50 text-yellow-700', PAGADO: 'bg-green-50 text-green-700', VENCIDO: 'bg-red-50 text-red-700' }[e] || '');
const tipoEmoji = (t) => ({ LUZ: '💡', GAS: '🔥', AGUA: '💧', INTERNET: '🌐', EXPENSAS: '🏢', TELEFONO: '📞', OTRO: '📄' }[t] || '📄');
const formatMonto = (m) => parseFloat(m || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 });
const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-AR') : '—';
const hoy = new Date();
const esVencida = (f) => f.estado === 'PENDIENTE' && new Date(f.fechaVence) < hoy;
const contratoActivo = computed(() => contratos.value.find(c => c.estado === 'ACTIVO'));

const fetchPropiedad = async () => {
  loading.value = true;
  try {
    const id = route.params.id;
    const [propRes, facturasRes, contratosRes] = await Promise.all([
      api.get(`/properties/${id}`),
      api.get('/facturas', { params: { propiedadId: id } }),
      api.get('/rentals'),
    ]);
    const p = propRes.data.data || propRes.data;
    propiedad.value = p;
    imagenes.value = p.imagenes || [];
    facturas.value = facturasRes.data.data || facturasRes.data;
    const allContratos = (contratosRes.data.data || contratosRes.data);
    const d = allContratos.data || allContratos;
    contratos.value = d.filter(c => c.propiedadId === id);
  } finally {
    loading.value = false;
  }
};

const subirImagenes = async (e) => {
  const files = Array.from(e.target.files);
  if (!files.length) return;
  const disponibles = 10 - imagenes.value.length;
  const aSubir = files.slice(0, disponibles);
  uploading.value = true; uploadError.value = '';
  try {
    for (const file of aSubir) {
      const ext = file.name.split('.').pop();
      const path = `${auth.tenant?.id}/${route.params.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('propiedades-imagenes').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('propiedades-imagenes').getPublicUrl(path);
      const { data: imgData } = await api.post('/properties/imagenes', {
        propiedadId: route.params.id,
        url: urlData.publicUrl,
        nombre: file.name,
      });
      imagenes.value.push(imgData.data || imgData);
    }
  } catch (err) {
    uploadError.value = 'Error al subir imagen: ' + (err.message || err);
  } finally {
    uploading.value = false;
    e.target.value = '';
  }
};

const eliminarImagen = async (img) => {
  if (!confirm('¿Eliminar esta foto?')) return;
  try {
    // Extract path from URL for Supabase storage deletion
    const url = new URL(img.url);
    const path = url.pathname.split('/propiedades-imagenes/')[1];
    if (path) await supabase.storage.from('propiedades-imagenes').remove([path]);
    await api.delete(`/properties/imagenes/${img.id}`);
    imagenes.value = imagenes.value.filter(i => i.id !== img.id);
  } catch (err) {
    alert('Error al eliminar imagen');
  }
};

const openEdit = () => router.push(`/properties?edit=${route.params.id}`);

onMounted(fetchPropiedad);
</script>
