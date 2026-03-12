<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Receipt :size="24" class="text-primary-500" /> Datos fiscales
      </h1>
      <p class="text-gray-500 text-sm mt-1">Información para emitir facturas a clientes</p>
    </div>

    <!-- Comisión de alquiler -->
    <div class="card p-6 max-w-2xl mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Percent :size="20" class="text-primary-500" /> Comisión de alquiler
      </h2>
      <p class="text-sm text-gray-500 mb-4">Porcentaje que se descuenta en las liquidaciones a propietarios (portal). Dejar vacío si no aplica.</p>
      <form @submit.prevent="guardarOperacion" class="flex items-end gap-4">
        <div class="flex-1 max-w-sm">
          <label class="label">Porcentaje (%)</label>
          <input v-model.number="operacion.comisionPorcentajeAlquiler" type="number" min="0" max="100" step="0.01" class="input" placeholder="Ej: 4.5" />
        </div>
        <button type="submit" :disabled="savingOperacion" class="btn-primary">
          {{ savingOperacion ? 'Guardando...' : 'Guardar' }}
        </button>
      </form>
      <p v-if="operacionGuardado" class="mt-3 text-sm text-green-600">Configuración guardada.</p>
    </div>

    <div class="card p-6 max-w-2xl">
      <form @submit.prevent="guardar" class="space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">CUIT / CUIL</label>
            <input v-model="form.cuit" class="input" placeholder="20-12345678-9" maxlength="13" />
            <p class="text-xs text-gray-400 mt-1">11 dígitos, con o sin guiones</p>
          </div>
          <div>
            <label class="label">Razón social</label>
            <input v-model="form.razonSocial" class="input" placeholder="Inmobiliaria García S.R.L." />
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="label">Condición frente al IVA</label>
            <select v-model="form.condicionIva" class="input">
              <option value="">Seleccionar...</option>
              <option v-for="c in condicionesIva" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>
          <div>
            <label class="label">Punto de venta (AFIP)</label>
            <input v-model.number="form.puntoVenta" type="number" min="1" max="9999" class="input" placeholder="1" />
          </div>
        </div>
        <div>
          <label class="label">Domicilio fiscal</label>
          <input v-model="form.domicilioFiscal" class="input" placeholder="Av. Corrientes 1234, CABA" />
        </div>
        <p v-if="formError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{{ formError }}</p>
        <p v-if="guardado" class="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">Datos guardados correctamente.</p>
        <div class="pt-2">
          <button type="submit" :disabled="saving" class="btn-primary">
            {{ saving ? 'Guardando...' : 'Guardar datos fiscales' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { Receipt, Percent } from 'lucide-vue-next';
import api from '../../services/api.js';

const form = ref({
  cuit: '',
  razonSocial: '',
  condicionIva: '',
  domicilioFiscal: '',
  puntoVenta: null,
});
const operacion = ref({ comisionPorcentajeAlquiler: null });
const formError = ref('');
const guardado = ref(false);
const saving = ref(false);
const savingOperacion = ref(false);
const operacionGuardado = ref(false);

const condicionesIva = [
  { value: 'RESPONSABLE_INSCRIPTO', label: 'Responsable Inscripto' },
  { value: 'MONOTRIBUTISTA', label: 'Monotributista' },
  { value: 'CONSUMIDOR_FINAL', label: 'Consumidor Final' },
  { value: 'EXENTO', label: 'Exento' },
  { value: 'NO_RESPONSABLE', label: 'No Responsable' },
];

const cargar = async () => {
  try {
    const { data } = await api.get('/tenant');
    form.value = {
      cuit: data.cuit || '',
      razonSocial: data.razonSocial || '',
      condicionIva: data.condicionIva || '',
      domicilioFiscal: data.domicilioFiscal || '',
      puntoVenta: data.puntoVenta ?? null,
    };
    operacion.value = { comisionPorcentajeAlquiler: data.comisionPorcentajeAlquiler ?? null };
  } catch (e) {
    formError.value = e.response?.data?.error || 'Error al cargar datos';
  }
};

const guardarOperacion = async () => {
  savingOperacion.value = true;
  operacionGuardado.value = false;
  try {
    await api.put('/tenant/operacion', {
      comisionPorcentajeAlquiler: operacion.value.comisionPorcentajeAlquiler === '' || operacion.value.comisionPorcentajeAlquiler == null
        ? null
        : Number(operacion.value.comisionPorcentajeAlquiler),
    });
    operacionGuardado.value = true;
    setTimeout(() => { operacionGuardado.value = false; }, 3000);
  } catch (e) {
    alert(e.response?.data?.message || 'Error al guardar');
  } finally {
    savingOperacion.value = false;
  }
};

const guardar = async () => {
  saving.value = true;
  formError.value = '';
  guardado.value = false;
  try {
    await api.put('/tenant/fiscal', form.value);
    guardado.value = true;
    setTimeout(() => { guardado.value = false; }, 3000);
  } catch (e) {
    formError.value = e.response?.data?.error || e.response?.data?.message || 'Error al guardar';
  } finally {
    saving.value = false;
  }
};

onMounted(cargar);
</script>
