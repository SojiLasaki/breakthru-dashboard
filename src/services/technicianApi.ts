import { api } from './apiClient';

/**
 * API: GET/POST /technicians/ , GET/PUT/PATCH/DELETE /technicians/{id}/
 * GET /technician/search/?q= → { manuals, parts, components, diagnostics }
 */
export interface Technician {
  id: string;
  first_name_display?: string;
  last_name_display?: string;
  first_name?: string;
  last_name?: string;
  email_display?: string;
  email?: string;
  phone_number?: string;
  hourly_rate?: number;
  specialization?: string;
  status?: string;
  street_address?: string;
  street_address_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  station?: string | null;
  active_tickets?: number;
  expertise?: string;
  photo?: string;
}

export interface TechTask {
  id: string;
  ticket_id: string;
  title: string;
  description: string;
  completed_at: string;
  duration_hours: number;
  status: 'completed' | 'cancelled' | 'in_progress' | 'pending';
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

const mapTechnician = (c: any): Technician => {
  const firstNameDisplay = c.first_name_display ?? c.first_name ?? '';
  const lastNameDisplay = c.last_name_display ?? c.last_name ?? '';
  const emailDisplay = c.email_display ?? c.email ?? '';
  const fullName = `${firstNameDisplay || ''} ${lastNameDisplay || ''}`.trim() || 'Unknown';

  const hourlyRaw = c.hourly_rate ?? c.hourlyRate ?? c.hourly ?? c.rate;
  const hourlyRate =
    typeof hourlyRaw === 'number'
      ? hourlyRaw
      : typeof hourlyRaw === 'string'
        ? Number(hourlyRaw)
        : undefined;

  return {
    id: String(c.id),
    first_name_display: firstNameDisplay || undefined,
    last_name_display: lastNameDisplay || undefined,
    first_name: firstNameDisplay || undefined,
    last_name: lastNameDisplay || undefined,
    email_display: emailDisplay || undefined,
    email: emailDisplay || undefined,
    phone_number: c.phone_number ?? '',
    hourly_rate: Number.isFinite(hourlyRate as number) ? (hourlyRate as number) : undefined,
    specialization: c.specialization ?? '',
    status: c.status ?? '',
    street_address: c.street_address ?? '',
    street_address_2: c.street_address_2 ?? '',
    city: c.city ?? '',
    state: c.state ?? '',
    postal_code: c.postal_code ?? '',
    country: c.country ?? '',
    station: c.station_name ?? c.station ?? null,
    active_tickets: c.active_tickets ?? c.assigned_tickets_count ?? 0,
    expertise: c.expertise ?? '',
    photo: c.photo ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=1a1f2e&color=e61409&size=96`,
  };
};

export const technicianApi = {
  getAll: async (): Promise<Technician[]> => {
    try {
      const { data } = await api.get('/technicians/');
      const list = Array.isArray(data?.results) ? data.results : data;
      const techs: Technician[] = Array.isArray(list) ? list.map(mapTechnician) : [];
      saveToCache(techs);
      return techs;
    } catch (error) {
      console.warn('Backend unavailable — loading cached customers');
      const cached = loadFromCache();
      console.log('Cached customers:', cached);
      return cached;
    }
  },

  getById: async (id: string): Promise<Technician> => {
    try {
      const { data } = await api.get(`/technicians/${id}/`);
      return mapTechnician(data);
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
      const mapped = mapTechnician(data);
      saveToCache([mapped, ...cached]);
      return mapped;
    } catch (error) {
      throw new Error('Failed to create technician');
    }
  },

  update: async (id: string, payload: Partial<Technician>): Promise<Technician> => {
    try {
      const { data } = await api.patch(`/technicians/${id}/`, payload);
      const mapped = mapTechnician(data);
      const cached = loadFromCache().map(t => (t.id === id ? mapped : t));
      saveToCache(cached);
      return mapped;
    } catch {
      throw new Error('Failed to update technician');
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/technicians/${id}/`);
      const cached = loadFromCache().filter(t => t.id !== id);
      saveToCache(cached);
    } catch {
      throw new Error('Failed to delete technician');
    }
  },

  getTaskHistory: async (technicianId: string): Promise<TechTask[]> => {
    try {
      const { data } = await api.get(`/technicians/${technicianId}/tasks/`);
      return data.results || data;
    } catch {
      return [];
    }
  },

  /** Search manuals, parts, components, diagnostics. GET /technician/search/?q= */
  search: async (query: string): Promise<{ manuals: unknown[]; parts: unknown[]; components: unknown[]; diagnostics: unknown[] }> => {
    try {
      const { data } = await api.get('/technician/search/', { params: { q: query || '' } });
      return {
        manuals: data?.manuals ?? [],
        parts: data?.parts ?? [],
        components: data?.components ?? [],
        diagnostics: data?.diagnostics ?? [],
      };
    } catch {
      return { manuals: [], parts: [], components: [], diagnostics: [] };
    }
  },
};