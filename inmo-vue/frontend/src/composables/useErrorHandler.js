// composables/useErrorHandler.js
// Manejo centralizado de errores de API

import { ref } from 'vue';

export function useErrorHandler() {
  const apiError = ref('');

  function handleError(error) {
    const msg = error?.response?.data?.message || error?.response?.data?.error || error?.message;

    if (Array.isArray(msg)) {
      // NestJS validation errors (array de strings)
      apiError.value = msg.join(' • ');
    } else if (typeof msg === 'string') {
      apiError.value = msg;
    } else {
      apiError.value = 'Ocurrió un error inesperado.';
    }

    // Auto-limpiar después de 5 segundos
    setTimeout(() => { apiError.value = ''; }, 5000);
  }

  function clearError() { apiError.value = ''; }

  return { apiError, handleError, clearError };
}

export default useErrorHandler;
