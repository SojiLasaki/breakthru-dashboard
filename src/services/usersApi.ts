import { api } from './apiClient';

// Shape matches backend /staffs/ response (display fields)
export interface UserProfile {
  id: number;
  username_display: string;
  email_display: string;
  first_name_display: string;
  last_name_display: string;
  phone_number: string | null;
  role: 'admin' | 'office' | 'technician' | 'customer';
  is_active: boolean;
  date_joined: string | null;
  last_login: string | null;
}

const mapUser = (raw: any): UserProfile => ({
  id: Number(raw.id),
  username_display: String(raw.username_display ?? raw.username ?? '').trim(),
  email_display: String(raw.email_display ?? raw.email ?? '').trim(),
  first_name_display: String(raw.first_name_display ?? raw.first_name ?? '').trim(),
  last_name_display: String(raw.last_name_display ?? raw.last_name ?? '').trim(),
  phone_number: raw.phone_number ?? null,
  role: (raw.role ?? 'customer') as UserProfile['role'],
  is_active: Boolean(raw.is_active ?? true),
  date_joined: raw.date_joined ?? null,
  last_login: raw.last_login ?? null,
});

export const usersApi = {
  getAll: async (): Promise<UserProfile[]> => {
    const { data } = await api.get('/staffs/');
    const list = Array.isArray(data?.results) ? data.results : data;
    if (!Array.isArray(list)) return [];
    return list.map(mapUser);
  },
  getById: async (id: number): Promise<UserProfile> => {
    const { data } = await api.get(`/staffs/${id}/`);
    return mapUser(data);
  },
};

