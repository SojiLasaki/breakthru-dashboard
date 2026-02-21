import { api } from './apiClient';

export interface Technician {
  id: number;
  first_name?: string;
  last_name?: string;
  name: string;
  email: string;
  specialization: 'engine' | 'electrical' | 'general';
  availability: 'available' | 'busy' | 'off_duty';
  street_address: string;
  street_address_2?: string;
  city: string;
  state: string;
  zip_code?: string;
  country?: string;
  lat: number;
  lng: number;
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
      const { data } = await api.get('/technicians/');
      const technicians = data.results || data;
      saveToCache(technicians);
      return technicians;
    } catch {
      return loadFromCache();
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