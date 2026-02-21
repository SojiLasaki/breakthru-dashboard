import { api } from './apiClient';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'office_staff' | 'engine_technician' | 'electrical_technician' | 'customer';
  is_active: boolean;
  date_joined: string;
  last_login: string;
}

const MOCK_USERS: UserProfile[] = [
  { id: 1, username: 'admin',      email: 'admin@breakthru.com',        first_name: 'Alex',    last_name: 'Carter',   role: 'admin',                  is_active: true,  date_joined: '2023-01-01', last_login: '2024-02-15T10:00:00Z' },
  { id: 2, username: 'office',     email: 'office@breakthru.com',       first_name: 'Lisa',    last_name: 'Monroe',   role: 'office_staff',            is_active: true,  date_joined: '2023-02-15', last_login: '2024-02-15T09:30:00Z' },
  { id: 6, username: 'staff2',     email: 'diana@breakthru.com',        first_name: 'Diana',   last_name: 'Wells',    role: 'office_staff',            is_active: true,  date_joined: '2023-05-20', last_login: '2024-02-14T11:00:00Z' },
  { id: 7, username: 'staff3',     email: 'marcus@breakthru.com',       first_name: 'Marcus',  last_name: 'Lee',      role: 'office_staff',            is_active: false, date_joined: '2023-07-10', last_login: '2024-01-05T16:00:00Z' },
  { id: 3, username: 'engine',     email: 'john.smith@breakthru.com',   first_name: 'John',    last_name: 'Smith',    role: 'engine_technician',       is_active: true,  date_joined: '2023-03-10', last_login: '2024-02-14T14:00:00Z' },
  { id: 4, username: 'electrical', email: 'bob.wilson@breakthru.com',   first_name: 'Bob',     last_name: 'Wilson',   role: 'electrical_technician',   is_active: true,  date_joined: '2023-03-10', last_login: '2024-02-15T08:00:00Z' },
  { id: 5, username: 'customer',   email: 'james.porter@breakthru.com', first_name: 'James',   last_name: 'Porter',   role: 'customer',                is_active: true,  date_joined: '2023-06-01', last_login: '2024-02-10T12:00:00Z' },
];

export const usersApi = {
  getAll: async (): Promise<UserProfile[]> => {
    try {
      const { data } = await api.get('/users/');
      return data.results || data;
    } catch {
      return MOCK_USERS;
    }
  },
  getById: async (id: number): Promise<UserProfile> => {
    try {
      const { data } = await api.get(`/users/${id}/`);
      return data;
    } catch {
      const u = MOCK_USERS.find(u => u.id === id);
      if (!u) throw new Error('User not found');
      return u;
    }
  },
};
