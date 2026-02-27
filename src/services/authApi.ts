import { api } from './apiClient';
import { User } from '@/context/AuthContext';

export const authApi = {
  login: async (username: string, password: string): Promise<User> => {
    const { data } = await api.post('/auth/login/', { username, password });
    return data;
  },
  logout: async () => {
    try { await api.post('/auth/logout/'); } catch { /* ignore */ }
  },
};
