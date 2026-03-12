<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Home :size="28" class="text-white" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">InmoSaaS</h1>
        <p class="text-gray-500 text-sm mt-1">Creá tu cuenta y empezá ahora</p>
      </div>

      <!-- Steps -->
      <div class="flex items-center gap-3 mb-6 px-2">
        <div class="flex items-center gap-2 flex-1" :class="step >= 1 ? 'text-primary-600' : 'text-gray-400'">
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            :class="step > 1 ? 'bg-green-500 text-white' : step === 1 ? 'bg-primary-500 text-white' : 'bg-gray-200'">
            <CheckCircle2 v-if="step > 1" :size="14" />
            <span v-else>1</span>
          </div>
          <span class="text-sm font-medium">Tu inmobiliaria</span>
        </div>
        <div class="h-px flex-1 bg-gray-200" />
        <div class="flex items-center gap-2 flex-1" :class="step >= 2 ? 'text-primary-600' : 'text-gray-400'">
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            :class="step === 2 ? 'bg-primary-500 text-white' : 'bg-gray-200'">2</div>
          <span class="text-sm font-medium">Tu cuenta</span>
        </div>
      </div>

      <div class="card p-6">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Step 1 -->
          <template v-if="step === 1">
            <div class="flex items-center gap-2 mb-2">
              <Building2 :size="18" class="text-primary-500" />
              <h2 class="text-base font-semibold text-gray-900">Datos de la inmobiliaria</h2>
            </div>
            <div>
              <label class="label">Nombre de la inmobiliaria</label>
              <input v-model="form.nombreInmobiliaria" class="input" placeholder="Ej: Propiedades del Sur" required />
            </div>
            <div>
              <label class="label">Email de la inmobiliaria</label>
              <input v-model="form.emailInmobiliaria" type="email" class="input" placeholder="info@mipropiedades.com" required />
            </div>
            <div>
              <label class="label">Teléfono <span class="text-gray-400 font-normal">(opcional)</span></label>
              <input v-model="form.telefonoInmobiliaria" type="tel" class="input" placeholder="+54 11 1234-5678" />
            </div>
          </template>

          <!-- Step 2 -->
          <template v-if="step === 2">
            <div class="flex items-center gap-2 mb-2">
              <User :size="18" class="text-primary-500" />
              <h2 class="text-base font-semibold text-gray-900">Tu cuenta de administrador</h2>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">Nombre</label>
                <input v-model="form.nombre" class="input" placeholder="Juan" required />
              </div>
              <div>
                <label class="label">Apellido</label>
                <input v-model="form.apellido" class="input" placeholder="García" required />
              </div>
            </div>
            <div>
              <label class="label">Email de acceso</label>
              <input v-model="form.emailAdmin" type="email" class="input" placeholder="vos@email.com" required />
            </div>
            <div>
              <label class="label">Contraseña</label>
              <div class="relative">
                <input v-model="form.password" :type="showPass ? 'text' : 'password'" class="input pr-10"
                  placeholder="Mínimo 6 caracteres" minlength="6" required />
                <button type="button" @click="showPass = !showPass" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <EyeOff v-if="showPass" :size="15" /><Eye v-else :size="15" />
                </button>
              </div>
            </div>
            <div class="bg-gray-50 rounded-xl p-3 text-sm">
              <p class="text-xs text-gray-500 mb-1">Inmobiliaria</p>
              <p class="font-medium text-gray-900">{{ form.nombreInmobiliaria }}</p>
              <p class="text-gray-500 text-xs">{{ form.emailInmobiliaria }}</p>
            </div>
          </template>

          <p v-if="error" class="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{{ error }}</p>

          <div class="flex gap-3 pt-2">
            <button v-if="step === 2" type="button" @click="step = 1" class="btn-secondary px-4">← Atrás</button>
            <button type="submit" :disabled="loading" class="btn-primary flex-1">
              {{ loading ? 'Creando cuenta...' : step === 1 ? 'Continuar →' : 'Crear cuenta' }}
            </button>
          </div>
        </form>

        <p class="text-center text-sm text-gray-500 mt-4">
          ¿Ya tenés cuenta?
          <RouterLink to="/login" class="text-primary-600 font-medium hover:underline ml-1">Iniciá sesión</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/auth.js';
import { Home, Building2, User, Eye, EyeOff, CheckCircle2 } from 'lucide-vue-next';
import api from '../../services/api.js';

const router = useRouter();
const auth = useAuthStore();
const step = ref(1);
const loading = ref(false);
const error = ref('');
const showPass = ref(false);
const form = ref({
  nombreInmobiliaria: '', emailInmobiliaria: '', telefonoInmobiliaria: '',
  nombre: '', apellido: '', emailAdmin: '', password: '',
});

const handleSubmit = async () => {
  if (step.value === 1) { step.value = 2; return; }
  loading.value = true;
  error.value = '';
  try {
    const { data } = await api.post('/auth/register', {
      tenant: { nombre: form.value.nombreInmobiliaria, email: form.value.emailInmobiliaria, telefono: form.value.telefonoInmobiliaria },
      admin: { nombre: form.value.nombre, apellido: form.value.apellido, email: form.value.emailAdmin, password: form.value.password },
    });
    const d = data.data || data;
    auth.setSession(d.token, d.usuario, d.tenant);
    router.push('/app/dashboard');
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al registrar';
  } finally {
    loading.value = false;
  }
};
</script>
