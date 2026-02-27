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

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
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