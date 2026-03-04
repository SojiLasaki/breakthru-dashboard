import { api } from './apiClient';

export interface StaffProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: 'admin' | 'office';
  status: string;
  station: string;
  date_joined: string;
  last_login: string;
  photo: string;
  street_address: string;
  street_address_2: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

const MOCK_STAFFS: StaffProfile[] = [
  {
    id: 'ddd',
    username: 'admin',
    email: 'admin@breakthru.com',
    first_name: 'Alex',
    last_name: 'Carter',
    phone_number: '555-1234',
    role: 'admin',
    station: "Indygo",
    status: "Available",
    photo: "",
    date_joined: '2023-01-01',
    last_login: '2024-02-15T10:00:00Z',
    street_address: '123 Main St',
    street_address_2: '',
    city: 'Anytown',
    state: 'CA',
    country: 'USA',
    postal_code: '12345',
  },
  {
    id: '1kk',
    username: 'office',
    email: 'office@breakthru.com',
    first_name: 'Lisa',
    last_name: 'Monroe',
    phone_number: '555-1234',
    role: 'office',
    station: "Indygo",
    photo: "",
    status: "Available",
    date_joined: '2023-02-15',
    last_login: '2024-02-15T09:30:00Z',
    street_address: '123 Main St',
    street_address_2: '',
    city: 'Anytown',
    state: 'CA',
    country: 'USA',
    postal_code: '12345',
  }
];

const CACHE_KEY = 'StaffProfiles_cache';

function saveToCache(data: StaffProfile[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function loadFromCache(): StaffProfile[] {
  const cached = localStorage.getItem(CACHE_KEY);
  return cached ? JSON.parse(cached) : [];
}

const mapStaff = (s: any): StaffProfile => {
  const roleRaw = String(s.role ?? '').toLowerCase();
  const role: StaffProfile['role'] =
    roleRaw === 'admin' || roleRaw === 'superuser'
      ? 'admin'
      : 'office';

  const statusRaw = String(s.status ?? '').toLowerCase();
  const status =
    statusRaw === 'busy' || statusRaw === 'unavailable'
      ? statusRaw
      : statusRaw === 'inactive'
        ? 'inactive'
        : 'active';

  return {
    id: String(s.id),
    username: String(s.username_display ?? s.username ?? '').trim(),
    email: String(s.email_display ?? s.email ?? '').trim(),
    first_name: String(s.first_name_display ?? s.first_name ?? '').trim(),
    last_name: String(s.last_name_display ?? s.last_name ?? '').trim(),
    phone_number: String(s.phone_number ?? '').trim(),
    role,
    status,
    station: String(s.station_name ?? '').trim(),
    street_address: String(s.street_address ?? '').trim(),
    street_address_2: String(s.street_address_2 ?? '').trim(),
    city: String(s.city ?? '').trim(),
    state: String(s.state ?? '').trim(),
    country: String(s.country ?? '').trim(),
    postal_code: String(s.postal_code ?? '').trim(),
    date_joined: String(s.date_joined ?? ''),
    last_login: String(s.last_login ?? ''),
    photo: s.photo
      ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(
        `${s.first_name_display ?? s.first_name ?? ''} ${s.last_name_display ?? s.last_name ?? ''}`.trim() || 'User',
      )}&background=1a1f2e&color=e61409&size=64`,
  };
};

export const staffApi = {
  getAll: async (): Promise<StaffProfile[]> => {
    try {
      const { data } = await api.get('/staffs/');
      const list = Array.isArray(data?.results) ? data.results : data;
      const staffs: StaffProfile[] = Array.isArray(list) ? list.map(mapStaff) : [];
      saveToCache(staffs);
      return staffs;
    } catch (error) {
      console.warn('Backend unavailable — loading cached staff');
      return loadFromCache().length ? loadFromCache() : MOCK_STAFFS;
    }
  },

  getById: async (id: string): Promise<StaffProfile> => {
    try {
      const { data } = await api.get(`/staffs/${id}/`);
      return mapStaff(data);
    } catch {
      const user = MOCK_STAFFS.find(u => u.id === id);
      if (!user) throw new Error('User not found');
      return user;
    }
  },

  create: async (payload: Partial<StaffProfile>): Promise<StaffProfile> => {
    try {
      const { data } = await api.post('/StaffProfiles/', payload);
      const cached = loadFromCache();
      saveToCache([data, ...cached]);
      return data;
    } catch (error) {
      throw new Error('Failed to create StaffProfile');
    }
  },

  update: async (id: string, payload: Partial<StaffProfile>): Promise<StaffProfile> => {
    try {
      const { data } = await api.patch(`/staffs/${id}/`, payload);
      const cached = loadFromCache().map(s => (s.id === id ? { ...s, ...data } : s));
      saveToCache(cached);
      return data;
    } catch {
      throw new Error('Failed to update staff');
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/StaffProfiles/${id}/`);
      const cached = loadFromCache().filter(s => s.id !== id);
      saveToCache(cached);
    } catch {
      throw new Error('Failed to delete staff');
    }
  },
};