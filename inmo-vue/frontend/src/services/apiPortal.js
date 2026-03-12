import axios from 'axios';

const apiPortal = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiPortal.interceptors.request.use((config) => {
  const token = localStorage.getItem('portalToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiPortal.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const isLoginRequest = err.config?.url?.includes('/portal/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('portalToken');
        localStorage.removeItem('portalUser');
        localStorage.removeItem('portalTenant');
        window.location.href = '/portal';
      }
    }
    return Promise.reject(err);
  }
);

export default apiPortal;
