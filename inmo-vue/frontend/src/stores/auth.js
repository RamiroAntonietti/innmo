import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api.js';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token'));
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'));
  const tenant = ref(JSON.parse(localStorage.getItem('tenant') || 'null'));
  const loading = ref(false);
  const error = ref('');

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.rol === 'ADMIN');

  const login = async (form) => {
    loading.value = true;
    error.value = '';
    try {
      const { data } = await api.post('/auth/login', form);
      setSession(data.token || data.data?.token, data.usuario || data.data?.usuario, data.tenant || data.data?.tenant);
      return true;
    } catch (err) {
      error.value = err.response?.data?.error || 'Error al iniciar sesión.';
      return false;
    } finally {
      loading.value = false;
    }
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    tenant.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
  };

  const setSession = (t, u, ten) => {
    token.value = t;
    user.value = u;
    tenant.value = ten;
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('tenant', JSON.stringify(ten));
  };

  return { token, user, tenant, loading, error, isAuthenticated, isAdmin, login, logout, setSession };
});
