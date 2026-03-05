<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Home :size="28" class="text-white" />
        </div>
        <h1 class="text-2xl font-bold text-gray-900">InmoSaaS</h1>
        <p class="text-gray-500 text-sm mt-1">Sistema de gestión inmobiliaria</p>
      </div>

      <div class="card p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-5">Iniciar sesión</h2>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="label">Email de la inmobiliaria</label>
            <input v-model="form.tenantEmail" type="email" class="input" placeholder="inmobiliaria@email.com" required />
          </div>
          <div>
            <label class="label">Tu email de usuario</label>
            <input v-model="form.email" type="email" class="input" placeholder="vos@email.com" required />
          </div>
          <div>
            <label class="label">Contraseña</label>
            <div class="relative">
              <input v-model="form.password" :type="showPass ? 'text' : 'password'" class="input pr-10" placeholder="••••••••" required />
              <button type="button" @click="showPass = !showPass" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <EyeOff v-if="showPass" :size="15" />
                <Eye v-else :size="15" />
              </button>
            </div>
          </div>

          <p v-if="auth.error" class="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{{ auth.error }}</p>

          <button type="submit" :disabled="auth.loading" class="btn-primary w-full flex items-center justify-center gap-2">
            <Loader2 v-if="auth.loading" :size="16" class="animate-spin" />
            {{ auth.loading ? 'Ingresando...' : 'Ingresar' }}
          </button>
        </form>

        <div class="mt-5 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
          <p class="font-medium text-gray-700 mb-1">Credenciales demo:</p>
          <p>Inmobiliaria: <span class="font-mono">demo@inmobiliaria.com</span></p>
          <p>Usuario: <span class="font-mono">admin@demo.com</span></p>
          <p>Password: <span class="font-mono">Admin123!</span></p>
        </div>

        <p class="text-center text-sm text-gray-500 mt-4">
          ¿No tenés cuenta?
          <RouterLink to="/registro" class="text-primary-600 font-medium hover:underline ml-1">Registrá tu inmobiliaria</RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/auth.js';
import { Home, Eye, EyeOff, Loader2 } from 'lucide-vue-next';

const router = useRouter();
const auth = useAuthStore();
const showPass = ref(false);
const form = ref({ tenantEmail: '', email: '', password: '' });

const handleSubmit = async () => {
  const ok = await auth.login(form.value);
  if (ok) router.push('/dashboard');
};
</script>
