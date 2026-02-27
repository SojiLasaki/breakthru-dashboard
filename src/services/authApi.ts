import { api } from './apiClient';
import { User } from '@/context/AuthContext';

export const authApi = {
  login: async (username: string, password: string): Promise<User> => {
    console.log('[authApi] Attempting login to:', api.defaults.baseURL + '/auth/login/');
    try {
      const { data } = await api.post('/auth/login/', { username, password });
      console.log('[authApi] Login response:', data);
      return data;
    } catch (err: any) {
      console.error('[authApi] Login failed:', err.response?.status, err.response?.data || err.message);
      throw err;
    }
  },
  logout: async () => {
    try { await api.post('/auth/logout/'); } catch { /* ignore */ }
  },
};
