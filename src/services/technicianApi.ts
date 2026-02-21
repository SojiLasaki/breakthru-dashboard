import { api } from './apiClient';

export interface Technician {
  id: number;
  first_name?: string;
  last_name?: string;
  email: string;
  specialization: 'engine' | 'electrical' | 'general';
  availability: 'available' | 'busy' | 'off_duty';
  street_address: string;
  street_address_2?: string;
  city: string;
  state: string;
  postal_code?: string;
  country?: string;
  // latitude: number;
  // longitude: number;
  station: string;
  active_tickets: number;
  phone: string;
  expertise: 'junior' | 'mid' | 'senior';
  photo: string;
}

export interface TechTask {
  id: number;
  ticket_id: string;
  title: string;
  description: string;
  completed_at: string;
  duration_hours: number;
  status: 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const CACHE_KEY = 'technicians_cache';

function saveToCache(data: Technician[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function loadFromCache(): Technician[] {
  const cached = localStorage.getItem(CACHE_KEY);
  return cached ? JSON.parse(cached) : [];
}

export const technicianApi = {
  getAll: async (): Promise<Technician[]> => {
    try {
      const { data } = await api.get('/customers/');
      const customers: Technician[] = (data.results ?? data).map(c => ({
        id: c.id,
        first_name: c.first_name_display,
        last_name: c.last_name_display,
        photo: c.photo ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(c.first_name_display ?? 'Unknown')}&background=1a1f2e&color=e61409&size=64`,
        email: c.email_display ?? '',
        phone: c.phone ?? '',
        street_address: c.street_address ?? '',
        street_address_2: c.street_address_2 ?? '',
        city: c.city ?? '',
        state: c.state ?? '',
        country: c.country ?? '',
        postal_code: c.postal_code ?? '',
        status: c.is_active ? 'active' : 'inactive',
        station: c.station ?? '',
        notes: c.notes ?? '',
        created_at: c.created_at,
        contact_person: c.name || 'Unknown'
      }));
  
      saveToCache(customers);
      console.log('Mapped customers:', customers);
      return customers;
    } catch (error) {
      console.warn('Backend unavailable — loading cached customers');
      const cached = loadFromCache();
      console.log('Cached customers:', cached);
      return cached;
    }
  },

  getById: async (id: number): Promise<Technician> => {
    try {
      const { data } = await api.get(`/technicians/${id}/`);
      return data;
    } catch {
      const cached = loadFromCache().find(t => t.id === id);
      if (!cached) throw new Error('Technician not found');
      return cached;
    }
  },

  create: async (payload: Partial<Technician>): Promise<Technician> => {
    try {
      const { data } = await api.post('/technicians/', payload);
      const cached = loadFromCache();
      saveToCache([data, ...cached]);
      return data;
    } catch (error) {
      throw new Error('Failed to create technician');
    }
  },

  update: async (id: number, payload: Partial<Technician>): Promise<Technician> => {
    try {
      const { data } = await api.patch(`/technicians/${id}/`, payload);
      const cached = loadFromCache().map(t => (t.id === id ? { ...t, ...data } : t));
      saveToCache(cached);
      return data;
    } catch {
      throw new Error('Failed to update technician');
    }
  },

  delete: async (id: number): Promise<void> => {
    try {
      await api.delete(`/technicians/${id}/`);
      const cached = loadFromCache().filter(t => t.id !== id);
      saveToCache(cached);
    } catch {
      throw new Error('Failed to delete technician');
    }
  },

  getTaskHistory: async (technicianId: number): Promise<TechTask[]> => {
    try {
      const { data } = await api.get(`/technicians/${technicianId}/tasks/`);
      return data.results || data;
    } catch {
      return [];
    }
  },
};