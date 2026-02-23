import { api } from './apiClient';

export interface StaffProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  station: string;
  date_joined: string;
  last_login: string;
  photo: string;
}

const MOCK_STAFFS: StaffProfile[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@breakthru.com',
    first_name: 'Alex',
    last_name: 'Carter',
    role: 'admin',
    station: "Indygo",
    status: "Available",
    photo: "",
    date_joined: '2023-01-01',
    last_login: '2024-02-15T10:00:00Z'
  },
  {
    id: 2,
    username: 'office',
    email: 'office@breakthru.com',
    first_name: 'Lisa',
    last_name: 'Monroe',
    role: 'office',
    station: "Indygo",
    photo: "",
    status: "Available",
    date_joined: '2023-02-15',
    last_login: '2024-02-15T09:30:00Z'
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
        photo: s.photo ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(s.first_name_display ?? 'Unknown')}&background=1a1f2e&color=e61409&size=64`,
        role: s.role,
        status: s.status,
        station: s.station_name ?? '',
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

  getById: async (id: number): Promise<StaffProfile> => {
    try {
      const { data } = await api.get(`/staffs/${id}/`);
      return data;
    } catch {
      const user = MOCK_STAFFS.find(u => u.id === id);
      if (!user) throw new Error('User not found');
      return user;
    }
  },
};