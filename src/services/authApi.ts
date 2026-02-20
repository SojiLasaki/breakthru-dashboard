import { api } from './apiClient';
import { User } from '@/context/AuthContext';

export const authApi = {
  login: async (username: string, password: string): Promise<User> => {
    try {
      const { data } = await api.post('/auth/login/', { username, password });
      return data;
    } catch {
      // Mock fallback for development
      const mockRoles: Record<string, User['role']> = {
        admin: 'admin',
        office: 'office_staff',
        engine: 'engine_technician',
        electrical: 'electrical_technician',
        customer: 'customer',
      };
      const role = mockRoles[username] || 'customer';
      return {
        id: 1,
        username,
        email: `${username}@cummins.com`,
        first_name: username.charAt(0).toUpperCase() + username.slice(1),
        last_name: 'User',
        role,
        token: 'mock-token-' + Date.now(),
      };
    }
  },
  logout: async () => {
    try { await api.post('/auth/logout/'); } catch { /* ignore */ }
  },
};
