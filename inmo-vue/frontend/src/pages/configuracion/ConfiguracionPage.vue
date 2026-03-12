<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Settings :size="24" class="text-primary-500" /> Configuración del sistema
      </h1>
      <p class="text-gray-500 text-sm mt-1">Datos de la inmobiliaria, logo, integraciones y más</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="tabActivo = tab.id"
        class="px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors"
        :class="tabActivo === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab: Datos -->
    <div v-if="tabActivo === 'datos'" class="card p-6 max-w-2xl">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Datos de la inmobiliaria</h2>
      <form @submit.prevent="guardarDatos" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">Nombre</label>
            <input v-model="formDatos.nombre" class="input" required />
          </div>
          <div>
            <label class="label">Email</label>
            <input v-model="formDatos.email" type="email" class="input bg-gray-50" readonly />
            <p class="text-xs text-gray-400 mt-1">Email de contacto</p>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">Teléfono</label>
            <input v-model="formDatos.telefono" class="input" placeholder="+54 11 1234-5678" />
          </div>
          <div>
            <label class="label">Sitio web</label>
            <input v-model="formDatos.sitioWeb" class="input" placeholder="https://www.miempresa.com" />
          </div>
        </div>
        <div>
          <label class="label">Dirección</label>
          <input v-model="formDatos.direccion" class="input" placeholder="Av. Corrientes 1234, CABA" />
        </div>
        <p v-if="msgDatos" class="text-sm" :class="msgDatos.type === 'ok' ? 'text-green-600' : 'text-red-600'">{{ msgDatos.text }}</p>
        <button type="submit" :disabled="savingDatos" class="btn-primary">{{ savingDatos ? 'Guardando...' : 'Guardar' }}</button>
      </form>
    </div>

    <!-- Tab: Logo -->
    <div v-if="tabActivo === 'logo'" class="card p-6 max-w-2xl">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Logo de la inmobiliaria</h2>
      <p class="text-sm text-gray-500 mb-4">Se usa en el portal del inquilino y en documentos. Formato recomendado: PNG o JPG, cuadrado.</p>
      <div class="flex items-start gap-6">
        <div class="flex-shrink-0">
          <div v-if="formDatos.logoUrl" class="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
            <img :src="formDatos.logoUrl" alt="Logo" class="w-full h-full object-contain" />
          </div>
          <div v-else class="w-24 h-24 rounded-xl bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-400 text-xs">Sin logo</div>
        </div>
        <div class="flex-1">
          <label class="btn-secondary cursor-pointer inline-flex items-center gap-2">
            <Upload :size="16" /> {{ uploadingLogo ? 'Subiendo...' : 'Subir logo' }}
            <input type="file" accept="image/*" class="hidden" @change="subirLogo" :disabled="uploadingLogo" />
          </label>
          <button v-if="formDatos.logoUrl" class="btn-secondary ml-2 text-red-500" @click="quitarLogo">Quitar logo</button>
        </div>
      </div>
    </div>

    <!-- Tab: Datos fiscales -->
    <div v-if="tabActivo === 'fiscal'" class="card p-6 max-w-2xl">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Datos fiscales (AFIP)</h2>
      <p class="text-sm text-gray-500 mb-4">Para emitir facturas a clientes</p>
      <form @submit.prevent="guardarFiscal" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">CUIT / CUIL</label>
            <input v-model="formFiscal.cuit" class="input" placeholder="20-12345678-9" maxlength="13" />
          </div>
          <div>
            <label class="label">Razón social</label>
            <input v-model="formFiscal.razonSocial" class="input" placeholder="Inmobiliaria García S.R.L." />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">Condición IVA</label>
            <select v-model="formFiscal.condicionIva" class="input">
              <option value="">Seleccionar...</option>
              <option v-for="c in condicionesIva" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>
          <div>
            <label class="label">Punto de venta</label>
            <input v-model.number="formFiscal.puntoVenta" type="number" min="1" max="9999" class="input" />
          </div>
        </div>
        <div>
          <label class="label">Domicilio fiscal</label>
          <input v-model="formFiscal.domicilioFiscal" class="input" placeholder="Av. Corrientes 1234, CABA" />
        </div>
        <p v-if="msgFiscal" class="text-sm" :class="msgFiscal.type === 'ok' ? 'text-green-600' : 'text-red-600'">{{ msgFiscal.text }}</p>
        <button type="submit" :disabled="savingFiscal" class="btn-primary">{{ savingFiscal ? 'Guardando...' : 'Guardar' }}</button>
      </form>
    </div>

    <!-- Tab: Comisión -->
    <div v-if="tabActivo === 'comision'" class="card p-6 max-w-2xl">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Comisión de alquiler</h2>
      <p class="text-sm text-gray-500 mb-4">Porcentaje que se descuenta en las liquidaciones a propietarios (portal).</p>
      <form @submit.prevent="guardarComision" class="flex items-end gap-4">
        <div class="flex-1 max-w-xs">
          <label class="label">Porcentaje (%)</label>
          <input v-model.number="formComision.comisionPorcentajeAlquiler" type="number" min="0" max="100" step="0.01" class="input" placeholder="Ej: 4.5" />
        </div>
        <button type="submit" :disabled="savingComision" class="btn-primary">{{ savingComision ? 'Guardando...' : 'Guardar' }}</button>
      </form>
      <p v-if="msgComision" class="text-sm text-green-600 mt-3">{{ msgComision }}</p>
    </div>

    <!-- Tab: Mercado Pago -->
    <div v-if="tabActivo === 'mp'" class="card p-6 max-w-2xl">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Mercado Pago</h2>
      <p class="text-sm text-gray-500 mb-4">Para que los inquilinos puedan pagar el alquiler desde el portal. Obtené las credenciales en <a href="https://www.mercadopago.com.ar/developers" target="_blank" rel="noopener" class="text-primary-500 hover:underline">Mercado Pago Developers</a>.</p>
      <form @submit.prevent="guardarMP" class="space-y-4">
        <div>
          <label class="label">Access Token (producción)</label>
          <input v-model="formMP.mpAccessToken" type="password" class="input font-mono" placeholder="APP_USR-xxxxxxxxxxxx" autocomplete="off" />
          <p v-if="tenant?.mpAccessTokenMasked" class="text-xs text-gray-400 mt-1">Configurado: {{ tenant.mpAccessTokenMasked }}. Dejar vacío para no cambiar.</p>
        </div>
        <div>
          <label class="label">Public Key (opcional, para Checkout Pro)</label>
          <input v-model="formMP.mpPublicKey" type="text" class="input font-mono" placeholder="APP_USR-xxxxxxxx" />
        </div>
        <p v-if="msgMP" class="text-sm" :class="msgMP.type === 'ok' ? 'text-green-600' : 'text-red-600'">{{ msgMP.text }}</p>
        <button type="submit" :disabled="savingMP" class="btn-primary">{{ savingMP ? 'Guardando...' : 'Guardar' }}</button>
      </form>
    </div>

    <!-- Tab: Mercado Libre -->
    <div v-if="tabActivo === 'ml'" class="card p-6 max-w-2xl">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Mercado Libre</h2>
      <p class="text-sm text-gray-500 mb-4">Integración para publicar propiedades en Mercado Libre. <em>Próximamente.</em></p>
      <form @submit.prevent="guardarML" class="space-y-4">
        <div>
          <label class="label">App ID</label>
          <input v-model="formML.mlAppId" class="input" placeholder="123456789" disabled />
        </div>
        <div>
          <label class="label">Client ID</label>
          <input v-model="formML.mlClientId" class="input" placeholder="123456789" disabled />
        </div>
        <div>
          <label class="label">Client Secret</label>
          <input v-model="formML.mlClientSecret" type="password" class="input" placeholder="••••••••" disabled />
        </div>
        <p class="text-gray-400 text-sm">La integración con Mercado Libre estará disponible en una futura actualización.</p>
      </form>
    </div>

    <!-- Tab: Otros -->
    <div v-if="tabActivo === 'otros'" class="card p-6 max-w-2xl">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Otras configuraciones</h2>
      <p class="text-sm text-gray-500">Más opciones de configuración se agregarán próximamente.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Settings, Upload } from 'lucide-vue-next';
import { createClient } from '@supabase/supabase-js';
import { useAuthStore } from '../../stores/auth.js';
import api from '../../services/api.js';

const auth = useAuthStore();
const tenant = ref(null);
const tabActivo = ref('datos');
const tabs = [
  { id: 'datos', label: 'Datos' },
  { id: 'logo', label: 'Logo' },
  { id: 'fiscal', label: 'Datos fiscales' },
  { id: 'comision', label: 'Comisión' },
  { id: 'mp', label: 'Mercado Pago' },
  { id: 'ml', label: 'Mercado Libre' },
  { id: 'otros', label: 'Otros' },
];

const formDatos = ref({ nombre: '', email: '', telefono: '', direccion: '', sitioWeb: '', logoUrl: '' });
const formFiscal = ref({ cuit: '', razonSocial: '', condicionIva: '', domicilioFiscal: '', puntoVenta: null });
const formComision = ref({ comisionPorcentajeAlquiler: null });
const formMP = ref({ mpAccessToken: '', mpPublicKey: '' });
const formML = ref({ mlAppId: '', mlClientId: '', mlClientSecret: '' });

const savingDatos = ref(false);
const savingFiscal = ref(false);
const savingComision = ref(false);
const savingMP = ref(false);
const uploadingLogo = ref(false);
const msgDatos = ref(null);
const msgFiscal = ref(null);
const msgComision = ref('');
const msgMP = ref(null);

const condicionesIva = [
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTISTA', label: 'Monotributista' },
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor Final' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'NO_RESPONSABLE', label: 'No Responsable' },
];

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

const cargar = async () => {
  const { data } = await api.get('/tenant');
  tenant.value = data;
  formDatos.value = {
    nombre: data.nombre || '',
    email: data.email || '',
    telefono: data.telefono || '',
    direccion: data.direccion || '',
    sitioWeb: data.sitioWeb || '',
    logoUrl: data.logoUrl || '',
  };
  formFiscal.value = {
    cuit: data.cuit || '',
    razonSocial: data.razonSocial || '',
    condicionIva: data.condicionIva || '',
    domicilioFiscal: data.domicilioFiscal || '',
    puntoVenta: data.puntoVenta ?? null,
  };
  formComision.value = { comisionPorcentajeAlquiler: data.comisionPorcentajeAlquiler ?? null };
  formMP.value = { mpAccessToken: '', mpPublicKey: data.mpPublicKey || '' };
  formML.value = { mlAppId: data.mlAppId || '', mlClientId: data.mlClientId || '', mlClientSecret: '' };
};

const guardarDatos = async () => {
  savingDatos.value = true;
  msgDatos.value = null;
  try {
    await api.put('/tenant/general', {
      nombre: formDatos.value.nombre,
      telefono: formDatos.value.telefono,
      direccion: formDatos.value.direccion,
      sitioWeb: formDatos.value.sitioWeb,
      logoUrl: formDatos.value.logoUrl,
    });
    msgDatos.value = { type: 'ok', text: 'Datos guardados.' };
    setTimeout(() => { msgDatos.value = null; }, 3000);
  } catch (e) {
    msgDatos.value = { type: 'err', text: e.response?.data?.error || 'Error al guardar' };
  } finally {
    savingDatos.value = false;
  }
};

const subirLogo = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  uploadingLogo.value = true;
  try {
    const ext = file.name.split('.').pop() || 'png';
    const path = `logos/${auth.tenant?.id}/logo.${ext}`;
    const { error } = await supabase.storage.from('propiedades-imagenes').upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('propiedades-imagenes').getPublicUrl(path);
    await api.put('/tenant/general', { logoUrl: urlData.publicUrl });
    formDatos.value.logoUrl = urlData.publicUrl;
    tenant.value = { ...tenant.value, logoUrl: urlData.publicUrl };
  } catch (err) {
    alert('Error al subir logo: ' + (err.message || err));
  } finally {
    uploadingLogo.value = false;
    e.target.value = '';
  }
};

const quitarLogo = async () => {
  if (!confirm('¿Quitar el logo?')) return;
  try {
    await api.put('/tenant/general', { logoUrl: '' });
    formDatos.value.logoUrl = '';
    tenant.value = { ...tenant.value, logoUrl: null };
  } catch (e) {
    alert(e.response?.data?.error || 'Error');
  }
};

const guardarFiscal = async () => {
  savingFiscal.value = true;
  msgFiscal.value = null;
  try {
    await api.put('/tenant/fiscal', formFiscal.value);
    msgFiscal.value = { type: 'ok', text: 'Datos fiscales guardados.' };
    setTimeout(() => { msgFiscal.value = null; }, 3000);
  } catch (e) {
    msgFiscal.value = { type: 'err', text: e.response?.data?.error || 'Error al guardar' };
  } finally {
    savingFiscal.value = false;
  }
};

const guardarComision = async () => {
  savingComision.value = true;
  msgComision.value = '';
  try {
    await api.put('/tenant/operacion', {
      comisionPorcentajeAlquiler: formComision.value.comisionPorcentajeAlquiler === '' || formComision.value.comisionPorcentajeAlquiler == null ? null : Number(formComision.value.comisionPorcentajeAlquiler),
    });
    msgComision.value = 'Configuración guardada.';
    setTimeout(() => { msgComision.value = ''; }, 3000);
  } catch (e) {
    msgComision.value = e.response?.data?.error || 'Error al guardar';
  } finally {
    savingComision.value = false;
  }
};

const guardarMP = async () => {
  savingMP.value = true;
  msgMP.value = null;
  try {
    const payload = {};
    if (formMP.value.mpAccessToken) payload.mpAccessToken = formMP.value.mpAccessToken;
    if (formMP.value.mpPublicKey !== undefined) payload.mpPublicKey = formMP.value.mpPublicKey;
    if (Object.keys(payload).length) await api.put('/tenant/mercado-pago', payload);
    msgMP.value = { type: 'ok', text: 'Datos de Mercado Pago guardados.' };
    formMP.value.mpAccessToken = '';
    setTimeout(() => { msgMP.value = null; }, 3000);
    cargar();
  } catch (e) {
    msgMP.value = { type: 'err', text: e.response?.data?.error || 'Error al guardar' };
  } finally {
    savingMP.value = false;
  }
};

onMounted(cargar);
</script>
