// import axios from 'axios';

// const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// export const api = axios.create({
//   baseURL: BASE_URL,
//   headers: { 'Content-Type': 'application/json' },
// });

// api.interceptors.request.use((config) => {
//   try {
//     const user = JSON.parse(localStorage.getItem('cummins_user') || '{}');
//     if (user?.token) config.headers.Authorization = `Bearer ${user.token}`;
//   } catch { /* ignore */ }
//   return config;
// });

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem('cummins_user');
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );


import axios from 'axios';

const defaultApiBase = (() => {
  // Many Django dev setups whitelist `127.0.0.1` but not `localhost` in `ALLOWED_HOSTS`.
  // When the frontend runs on `localhost`, prefer hitting the backend via `127.0.0.1` to avoid 400s.
  if (typeof window === 'undefined') return 'http://127.0.0.1:8000/api';
  const host = window.location.hostname || '127.0.0.1';
  const apiHost = host === 'localhost' ? '127.0.0.1' : host;
  return `http://${apiHost}:8000/api`;
})();

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  // Don't attach token to login/refresh requests
  const isAuthEndpoint = config.url?.includes('/auth/login') || config.url?.includes('/auth/refresh');
  if (!isAuthEndpoint) {
    const token = localStorage.getItem('access');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
