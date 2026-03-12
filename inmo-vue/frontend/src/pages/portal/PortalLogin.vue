<template>
  <div class="min-h-dvh flex items-center justify-center bg-gray-50 p-4">
    <div class="card w-full max-w-md p-8">
      <div class="text-center mb-8">
        <div class="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Home :size="28" class="text-white" />
        </div>
        <h1 class="text-xl font-bold text-gray-900">Portal de acceso</h1>
        <p class="text-gray-500 text-sm mt-1">Inquilinos y propietarios</p>
      </div>
      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="label">Email</label>
          <input v-model="form.email" type="email" class="input" required placeholder="tu@email.com" />
        </div>
        <div>
          <label class="label">Contraseña</label>
          <input v-model="form.password" type="password" class="input" required placeholder="••••••••" />
        </div>
        <p v-if="portalAuth.error" class="text-sm text-red-600">{{ portalAuth.error }}</p>
        <button type="submit" :disabled="portalAuth.loading" class="btn-primary w-full py-3">
          {{ portalAuth.loading ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
      <p class="text-center text-xs text-gray-400 mt-6">
        ¿Sos inmobiliaria? <RouterLink to="/" class="text-primary-600 hover:underline">Accedé al panel</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Home } from 'lucide-vue-next';
import { usePortalAuthStore } from '../../stores/portalAuth.js';

const portalAuth = usePortalAuthStore();
const router = useRouter();
const form = ref({ email: '', password: '' });

const submit = async () => {
  const ok = await portalAuth.login(form.value);
  if (ok) {
    if (portalAuth.primerLogin) {
      router.push('/portal/cambiar-password');
    } else if (portalAuth.isInquilino) {
      router.push('/portal/inquilino');
    } else {
      router.push('/portal/propietario');
    }
  }
};
</script>
