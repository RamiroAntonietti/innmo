import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api.js';

export const usePortalAuthStore = defineStore('portalAuth', () => {
  const token = ref(localStorage.getItem('portalToken'));
  const user = ref(JSON.parse(localStorage.getItem('portalUser') || 'null'));
  const tenant = ref(JSON.parse(localStorage.getItem('portalTenant') || 'null'));
  const loading = ref(false);
  const error = ref('');

  const isAuthenticated = computed(() => !!token.value);
  const isInquilino = computed(() => user.value?.rol === 'INQUILINO');
  const isPropietario = computed(() => user.value?.rol === 'PROPIETARIO');
  const primerLogin = computed(() => user.value?.primerLogin === true);

  const login = async (form) => {
    loading.value = true;
    error.value = '';
    try {
      const { data } = await api.post('/portal/auth/login', form);
      setSession(data.token, data.usuario, data.tenant);
      return true;
    } catch (err) {
      const msg = err.response?.data?.message;
      error.value = Array.isArray(msg) ? msg[0] : (msg || 'Credenciales inválidas.');
      return false;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    tenant.value = null;
    localStorage.removeItem('portalToken');
    localStorage.removeItem('portalUser');
    localStorage.removeItem('portalTenant');
  };

  const setSession = (t, u, ten) => {
    token.value = t;
    user.value = u;
    tenant.value = ten;
    localStorage.setItem('portalToken', t);
    localStorage.setItem('portalUser', JSON.stringify(u));
    localStorage.setItem('portalTenant', JSON.stringify(ten));
  };

  const getAuthHeader = () => (token.value ? { Authorization: `Bearer ${token.value}` } : {});

  return {
    token,
    user,
    tenant,
    loading,
    error,
    isAuthenticated,
    isInquilino,
    isPropietario,
    primerLogin,
    login,
    logout,
    setSession,
    getAuthHeader,
  };
});
