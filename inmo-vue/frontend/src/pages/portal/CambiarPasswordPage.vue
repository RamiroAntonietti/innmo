<template>
  <div class="max-w-md mx-auto">
    <div class="card p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-2">Cambiar contraseña</h2>
      <p class="text-sm text-gray-500 mb-6">Es tu primer acceso. Por seguridad, cambiá tu contraseña temporal.</p>
      <form @submit.prevent="submit" class="space-y-4">
        <div>
          <label class="label">Contraseña actual</label>
          <input v-model="form.passwordActual" type="password" class="input" required />
        </div>
        <div>
          <label class="label">Nueva contraseña</label>
          <input v-model="form.passwordNueva" type="password" class="input" required minlength="8" />
          <p class="text-xs text-gray-400 mt-1">Mínimo 8 caracteres, con letras y números</p>
        </div>
        <div>
          <label class="label">Confirmar nueva contraseña</label>
          <input v-model="form.confirmar" type="password" class="input" required />
        </div>
        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
        <button type="submit" :disabled="saving" class="btn-primary w-full py-3">
          {{ saving ? 'Guardando...' : 'Cambiar contraseña' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import apiPortal from '../../services/apiPortal.js';
import { usePortalAuthStore } from '../../stores/portalAuth.js';

const portalAuth = usePortalAuthStore();
const router = useRouter();
const form = ref({ passwordActual: '', passwordNueva: '', confirmar: '' });
const error = ref('');
const saving = ref(false);

const submit = async () => {
  if (form.value.passwordNueva !== form.value.confirmar) {
    error.value = 'Las contraseñas no coinciden.';
    return;
  }
  if (form.value.passwordNueva.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres.';
    return;
  }
  saving.value = true;
  error.value = '';
  try {
    await apiPortal.post('/portal/auth/cambiar-password', {
      passwordActual: form.value.passwordActual,
      passwordNueva: form.value.passwordNueva,
    });
    portalAuth.user = { ...portalAuth.user, primerLogin: false };
    localStorage.setItem('portalUser', JSON.stringify(portalAuth.user));
    if (portalAuth.isInquilino) router.push('/portal/inquilino');
    else router.push('/portal/propietario');
  } catch (e) {
    error.value = e.response?.data?.message || 'Error al cambiar contraseña.';
  } finally {
    saving.value = false;
  }
};
</script>
