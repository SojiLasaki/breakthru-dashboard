import { api } from './apiClient';

export type ScheduleStatus = 'upcoming' | 'ongoing' | 'completed' | 'overdue';

export interface Schedule {
  id: string;
  customer: string;
  customer_name: string;
  technician: string;
  technician_name: string;
  technician_username?: string | null;
  technician_profile_id?: string | null;
  technician_id?: number | string | null;
  ticket: string | null;
  ticket_id: string | null;
  scheduled_time: string;
  duration: string;
  estimated_end_time?: string | null;
  estimated_duration_minutes?: number | null;
  description: string;
  created_at: string;
  updated_at: string;
}

/** Map backend schedule object to frontend Schedule (list + ticket's schedules use same shape). */
export function normalizeSchedule(raw: any): Schedule {
  const id = raw?.id != null ? String(raw.id) : '';
  const scheduled = raw?.scheduled_time ?? raw?.scheduled_at ?? '';
  const duration = typeof raw?.duration === 'string' ? raw.duration : (raw?.duration ? '01:00:00' : '00:00:00');
  const techId = raw?.technician_id ?? raw?.technician_profile_id ?? raw?.technician;
  const custId = raw?.customer_id ?? raw?.customer;
  const techProfileId = raw?.technician_profile_id != null ? String(raw.technician_profile_id) : null;
  const techIdNum = raw?.technician_id != null ? (typeof raw.technician_id === 'number' ? raw.technician_id : Number(raw.technician_id)) : null;
  return {
    id,
    customer: typeof custId === 'string' ? custId : (custId != null ? String(custId) : ''),
    customer_name: (raw?.customer_display_name ?? raw?.customer_name ?? '').trim() || '—',
    technician: typeof techId === 'string' ? techId : (techId != null ? String(techId) : ''),
    technician_name: (raw?.technician_display_name ?? raw?.technician_name ?? '').trim() || '—',
    technician_username: typeof raw?.technician_username === 'string' ? raw.technician_username.trim() : undefined,
    technician_profile_id: techProfileId || undefined,
    technician_id: techIdNum ?? (typeof raw?.technician_id === 'number' ? raw.technician_id : undefined),
    ticket: raw?.ticket_id ?? raw?.ticket ?? null,
    ticket_id: (raw?.ticket_ticket_id ?? raw?.ticket_id ?? raw?.ticket_no ?? '').trim() || null,
    scheduled_time: scheduled,
    duration,
    estimated_end_time: raw?.estimated_end_time ?? null,
    estimated_duration_minutes: typeof raw?.estimated_duration_minutes === 'number' ? raw.estimated_duration_minutes : null,
    description: (raw?.description ?? '').trim() || '',
    created_at: raw?.created_at ?? raw?.createdAt ?? '',
    updated_at: raw?.updated_at ?? raw?.updatedAt ?? raw?.created_at ?? '',
  };
}

export function getScheduleStatus(scheduled_time: string, duration: string): ScheduleStatus {
  const start = new Date(scheduled_time);
  const durationMs = parseDuration(duration);
  const end = new Date(start.getTime() + durationMs);
  const now = new Date();

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'ongoing';
  if (now > end) return 'completed';
  return 'completed';
}

export function parseDuration(dur: string): number {
  // "HH:MM:SS" format
  const parts = dur.split(':');
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    const s = parseInt(parts[2], 10) || 0;
    return (h * 3600 + m * 60 + s) * 1000;
  }
  return 0;
}

export function formatDuration(dur: string): string {
  const parts = dur.split(':');
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10) || 0;
    const m = parseInt(parts[1], 10) || 0;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }
  return dur;
}

// ── Mock Data ──────────────────────────────────────────────────────────────

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

function dateAt(daysOffset: number, hours: number, minutes = 0): string {
  const d = new Date(today);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

const MOCK_SCHEDULES: Schedule[] = [
  {
    id: 'sch-001', customer: 'cust-1', customer_name: 'Acme Corp',
    technician: 'tech-1', technician_name: 'John Smith',
    ticket: 'tk-1', ticket_id: 'TK-001',
    scheduled_time: dateAt(0, 9), duration: '02:00:00',
    description: 'Engine inspection and diagnostics for Unit #4.',
    created_at: dateAt(-3, 8), updated_at: dateAt(-1, 10),
  },
  {
    id: 'sch-002', customer: 'cust-2', customer_name: 'Beta Industries',
    technician: 'tech-2', technician_name: 'Maria Garcia',
    ticket: 'tk-2', ticket_id: 'TK-002',
    scheduled_time: dateAt(0, 13, 30), duration: '03:00:00',
    description: 'Fuel injector replacement on cylinders 2 & 4.',
    created_at: dateAt(-2, 14), updated_at: dateAt(-1, 9),
  },
  {
    id: 'sch-003', customer: 'cust-3', customer_name: 'Gamma LLC',
    technician: 'tech-3', technician_name: 'Bob Wilson',
    ticket: null, ticket_id: null,
    scheduled_time: dateAt(1, 10), duration: '01:30:00',
    description: 'Routine electrical panel inspection.',
    created_at: dateAt(-1, 11), updated_at: dateAt(-1, 11),
  },
  {
    id: 'sch-004', customer: 'cust-4', customer_name: 'Delta Co',
    technician: 'tech-1', technician_name: 'John Smith',
    ticket: 'tk-4', ticket_id: 'TK-004',
    scheduled_time: dateAt(-1, 8), duration: '04:00:00',
    description: 'Oil pressure investigation and repair.',
    created_at: dateAt(-5, 9), updated_at: dateAt(-2, 16),
  },
  {
    id: 'sch-005', customer: 'cust-1', customer_name: 'Acme Corp',
    technician: 'tech-2', technician_name: 'Maria Garcia',
    ticket: 'tk-5', ticket_id: 'TK-005',
    scheduled_time: dateAt(2, 11), duration: '02:30:00',
    description: 'Coolant system pressure test and seal replacement.',
    created_at: dateAt(-1, 8), updated_at: dateAt(-1, 8),
  },
  {
    id: 'sch-006', customer: 'cust-5', customer_name: 'Epsilon Energy',
    technician: 'tech-3', technician_name: 'Bob Wilson',
    ticket: 'tk-6', ticket_id: 'TK-006',
    scheduled_time: dateAt(3, 14), duration: '01:00:00',
    description: 'Generator load testing — annual maintenance cycle.',
    created_at: dateAt(0, 7), updated_at: dateAt(0, 7),
  },
  {
    id: 'sch-007', customer: 'cust-2', customer_name: 'Beta Industries',
    technician: 'tech-1', technician_name: 'John Smith',
    ticket: null, ticket_id: null,
    scheduled_time: dateAt(-2, 9), duration: '05:00:00',
    description: 'Full engine overhaul — preventive maintenance.',
    created_at: dateAt(-7, 10), updated_at: dateAt(-3, 15),
  },
  {
    id: 'sch-008', customer: 'cust-3', customer_name: 'Gamma LLC',
    technician: 'tech-2', technician_name: 'Maria Garcia',
    ticket: 'tk-7', ticket_id: 'TK-007',
    scheduled_time: dateAt(0, 16), duration: '01:30:00',
    description: 'Starter motor diagnostics and repair.',
    created_at: dateAt(-1, 12), updated_at: dateAt(0, 8),
  },
];

let mockSchedules = [...MOCK_SCHEDULES];

export interface ScheduleListParams {
  technician?: string | number;
  customer?: string;
  ticket?: string;
  from_date?: string;
  to_date?: string;
  ordering?: string;
}

export const scheduleApi = {
  getAll: async (params?: ScheduleListParams): Promise<Schedule[]> => {
    try {
      const { data } = await api.get('/schedules/', { params: params as Record<string, string> });
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      return list.map((raw: any) => normalizeSchedule(raw));
    } catch {
      return mockSchedules;
    }
  },

  /** Schedules for a specific ticket. GET /api/tickets/{ticket_id}/schedules/ */
  getByTicketId: async (ticketId: string): Promise<Schedule[]> => {
    try {
      const { data } = await api.get(`/tickets/${ticketId}/schedules/`);
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      return list.map((raw: any) => normalizeSchedule(raw));
    } catch {
      return [];
    }
  },

  getById: async (id: string): Promise<Schedule> => {
    try {
      const { data } = await api.get(`/schedules/${id}/`);
      return normalizeSchedule(data ?? {});
    } catch {
      const s = mockSchedules.find(s => s.id === id);
      if (!s) throw new Error('Schedule not found');
      return s;
    }
  },

  create: async (payload: Partial<Schedule>): Promise<Schedule> => {
    try {
      const { data } = await api.post('/schedules/', payload);
      return data;
    } catch {
      const newSchedule: Schedule = {
        id: `sch-${Date.now()}`,
        customer: payload.customer ?? '',
        customer_name: payload.customer_name ?? '',
        technician: payload.technician ?? '',
        technician_name: payload.technician_name ?? '',
        ticket: payload.ticket ?? null,
        ticket_id: payload.ticket_id ?? null,
        scheduled_time: payload.scheduled_time ?? new Date().toISOString(),
        duration: payload.duration ?? '01:00:00',
        description: payload.description ?? '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockSchedules = [newSchedule, ...mockSchedules];
      return newSchedule;
    }
  },

  update: async (id: string, payload: Partial<Schedule>): Promise<Schedule> => {
    try {
      const { data } = await api.patch(`/schedules/${id}/`, payload);
      return data;
    } catch {
      const idx = mockSchedules.findIndex(s => s.id === id);
      if (idx !== -1) {
        mockSchedules[idx] = { ...mockSchedules[idx], ...payload, updated_at: new Date().toISOString() };
        return mockSchedules[idx];
      }
      throw new Error('Schedule not found');
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/schedules/${id}/`);
    } catch {
      mockSchedules = mockSchedules.filter(s => s.id !== id);
    }
  },
};
