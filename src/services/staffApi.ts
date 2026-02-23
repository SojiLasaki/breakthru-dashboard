import { api } from './apiClient';

export interface StaffProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
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

export const staffApi = {
  getAll: async (): Promise<StaffProfile[]> => {
    try {
      const { data } = await api.get('/staffs/');
      const staffs: StaffProfile[] = (data.results ?? data).map((s: any) => ({
        id: s.id,
        username: s.username_display ?? '',
        email: s.email_display ?? '',
        first_name: s.first_name_display ?? '',
        last_name: s.last_name_display ?? '',
        phone_number: s.phone_number ?? '',
        photo: s.photo ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(s.first_name_display ?? 'Unknown')}&background=1a1f2e&color=e61409&size=64`,
        role: s.role,
        status: s.status,
        station: s.station_name ?? '',
        street_address: s.street_address ?? '',
        street_address_2: s.street_address_2 ?? '',
        city: s.city ?? '',
        state: s.state ?? '',
        country: s.country ?? '',
        postal_code: s.postal_code ?? '',
        date_joined: s.date_joined,
        last_login: s.last_login,
      }));

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
      return data;
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