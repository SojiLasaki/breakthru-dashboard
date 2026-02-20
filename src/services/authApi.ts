import { api } from './apiClient';
import { User } from '@/context/AuthContext';

export const authApi = {
  login: async (username: string, password: string): Promise<User> => {
    try {
      const { data } = await api.post('/auth/login/', { username, password });
      return data;
    } catch {
      // Mock fallback for development — real names match technician records
      const MOCK_USERS: Record<string, Omit<User, 'token'>> = {
        admin:      { id: 1, username: 'admin',      email: 'admin@cummins.com',      first_name: 'Alex',  last_name: 'Carter',  role: 'admin' },
        office:     { id: 2, username: 'office',     email: 'office@cummins.com',     first_name: 'Lisa',  last_name: 'Monroe',  role: 'office_staff' },
        engine:     { id: 3, username: 'engine',     email: 'john.smith@cummins.com', first_name: 'John',  last_name: 'Smith',   role: 'engine_technician' },
        electrical: { id: 4, username: 'electrical', email: 'bob.wilson@cummins.com', first_name: 'Bob',   last_name: 'Wilson',  role: 'electrical_technician' },
        customer:   { id: 5, username: 'customer',   email: 'customer@cummins.com',   first_name: 'James', last_name: 'Porter',  role: 'customer' },
      };
      const profile = MOCK_USERS[username] ?? { id: 99, username, email: `${username}@cummins.com`, first_name: username, last_name: '', role: 'customer' as User['role'] };
      return { ...profile, token: 'mock-token-' + Date.now() };
    }
  },
  logout: async () => {
    try { await api.post('/auth/logout/'); } catch { /* ignore */ }
  },
};
