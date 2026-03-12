import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || '';
      const isAuthRequest = url.includes('/auth/login') || url.includes('/portal/auth/login');
      if (!isAuthRequest) {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
