import { api } from './apiClient';
import { User } from '@/context/AuthContext';

/**
 * Login response: { access, refresh, user: { ... }, role?, username? }
 * Token: data.access. User: data.user.
 * Technician user fields: email (user.email), phone (user.phone_number), station display (user.station_name), station UUID (user.station), location/city (user.location), specialization (user.specialization), expertise (user.expertise), role (user.role).
 * Non-technicians may have station, station_name, location where applicable.
 */
export const authApi = {
  login: async (username: string, password: string): Promise<unknown> => {
    try {
      const { data } = await api.post('/api/auth/login/', { username, password });
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

  /**
   * Fetch user profile by username to fill null fields. Uses backend routes: all-users, admin-users.
   */
  getProfileByUsername: async (username: string): Promise<unknown | null> => {
    if (!username || !String(username).trim()) return null;
    const q = encodeURIComponent(username);
    const endpoints = [
      `/all-users/?username=${q}`,
      `/admin-users/?username=${q}`,
    ];
    for (const url of endpoints) {
      try {
        const { data } = await api.get(url);
        if (data != null && typeof data === 'object') {
          const list = Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [];
          const raw = list[0] ?? (typeof data === 'object' && !Array.isArray(data) ? data : null);
          if (raw && typeof raw === 'object') return raw;
        }
      } catch {
        continue;
      }
    }
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
