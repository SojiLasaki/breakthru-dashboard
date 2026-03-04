import { api } from './apiClient';
import { User } from '@/context/AuthContext';

/**
 * API docs: POST /auth/login/, POST /auth/refresh/ — no GET current-user endpoint.
 * Technicians: GET /technicians/{id}/ for profile.
 */
export const authApi = {
  login: async (username: string, password: string): Promise<User> => {
    try {
      const { data } = await api.post('/auth/login/', { username, password });
      return data;
    } catch (err: unknown) {
      console.error('[authApi] Login failed:', err);
      throw err;
    }
  },

  /** No /me/ or /auth/user/ endpoint — use stored login data. Returns null so callers keep existing user. */
  getMe: async (): Promise<null> => {
    return null;
  },

  /** Fetch profile via GET /technicians/{id}/. Pass technician profile pk (not User id). */
  getProfile: async (technicianId?: string | number): Promise<unknown | null> => {
    if (technicianId == null || technicianId === '') return null;
    try {
      const { data } = await api.get(`/technicians/${String(technicianId)}/`);
      return data && typeof data === 'object' ? data : null;
    } catch {
      return null;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout/');
    } catch {
      /* ignore */
    }
  },
};
