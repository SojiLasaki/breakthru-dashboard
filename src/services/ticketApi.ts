import { api } from './apiClient';
import { isAxiosError } from 'axios';

export interface Ticket {
  id: string;
  ticket_id: string;
  assigned_technician: string;
  assigned_technician_profile_id: string;
  assigned_technician_first_name: string;
  assigned_technician_last_name: string;
  title: string;
  customer: string;
  issue_description: string;
  specialization: string;
  severity: number;
  status: string;
  priority: number;
  customer_satisfaction_rating: number;
  estimated_resolution_time_minutes: number;
  actual_resolution_time_minutes: number;
  predictied_resolution_summary: string;
  auto_assigned: boolean;
  parts: [];
  assigned_to: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  description: string;
  diagnostic_reports: [];
}

const toText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const toNum = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const joinName = (first: unknown, last: unknown): string => {
  const f = toText(first);
  const l = toText(last);
  return `${f} ${l}`.trim();
};

const pick = (...values: unknown[]): string => {
  for (const v of values) {
    const t = toText(v);
    if (t) return t;
  }
  return '';
};

const unwrapList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.tickets)) return data.tickets;
  return [];
};

const normalizeTicket = (raw: any): Ticket => {
  const assignedName = pick(
    raw?.assigned_to,
    raw?.assigned_technician,
    joinName(raw?.assigned_technician_first_name, raw?.assigned_technician_last_name),
  );

  const createdBy = pick(
    raw?.created_by,
    joinName(raw?.created_by_first_name, raw?.created_by_last_name),
    raw?.customer,
  );

  const id = pick(raw?.id);
  const ticketId = pick(raw?.ticket_id, raw?.ticket_no, raw?.reference, raw?.id ? `TK-${toText(raw.id)}` : '');

  return {
    id,
    ticket_id: ticketId,
    assigned_technician: pick(raw?.assigned_technician, assignedName),
    assigned_technician_profile_id: pick(raw?.assigned_technician_profile_id),
    assigned_technician_first_name: pick(raw?.assigned_technician_first_name),
    assigned_technician_last_name: pick(raw?.assigned_technician_last_name),
    title: pick(raw?.title, raw?.summary),
    customer: pick(raw?.customer),
    issue_description: pick(raw?.issue_description, raw?.description),
    specialization: pick(raw?.specialization, raw?.category),
    severity: toNum(raw?.severity, 3),
    status: pick(raw?.status, 'open') || 'open',
    priority: toNum(raw?.priority, 2),
    customer_satisfaction_rating: toNum(raw?.customer_satisfaction_rating, 0),
    estimated_resolution_time_minutes: toNum(raw?.estimated_resolution_time_minutes, 0),
    actual_resolution_time_minutes: toNum(raw?.actual_resolution_time_minutes, 0),
    predictied_resolution_summary: pick(raw?.predictied_resolution_summary, raw?.predicted_resolution_summary),
    auto_assigned: Boolean(raw?.auto_assigned),
    parts: Array.isArray(raw?.parts) ? raw.parts : [],
    assigned_to: assignedName,
    created_by: createdBy,
    created_at: pick(raw?.created_at, raw?.createdAt),
    updated_at: pick(raw?.updated_at, raw?.updatedAt, raw?.created_at, raw?.createdAt),
    description: pick(raw?.description, raw?.issue_description),
    diagnostic_reports: Array.isArray(raw?.diagnostic_reports) ? raw.diagnostic_reports : [],
  };
};

const MOCK_TICKETS: Ticket[] = [
  {
    id: "1",
    ticket_id: "TK-001",
    assigned_technician: "John Smith",
    assigned_technician_profile_id: "e9d2a3f4-12ab-4c56-b789-123456abcdef",
    assigned_technician_first_name: "John",
    assigned_technician_last_name: "Smith",
    title: "Engine Overheating - Unit #4",
    customer: "Acme Corp",
    // product_id: "PRD-4401",
    issue_description: "Engine temperature exceeding safe limits during sustained load.",
    specialization: "Engine",
    severity: 5,
    status: "in_progress",
    priority: 5,
    customer_satisfaction_rating: 0,
    estimated_resolution_time_minutes: 120,
    actual_resolution_time_minutes: 0,
    predictied_resolution_summary: "",
    auto_assigned: true,
    parts: [],
    assigned_to: "John Smith",
    created_by: "James Porter",
    created_at: "2024-02-15T09:00:00Z",
    updated_at: "2024-02-15T11:00:00Z",
    description: "Engine temperature exceeding safe limits",
    diagnostic_reports: [],
  },
  {
    id: "2",
    ticket_id: "TK-002",
    assigned_technician: "Maria Garcia",
    assigned_technician_profile_id: "f3a1b2c4-56de-4a12-b789-abcdef123456",
    assigned_technician_first_name: "Maria",
    assigned_technician_last_name: "Garcia",
    title: "Fuel Injector Replacement",
    customer: "Beta Industries",
    // product_id: "PRD-6701",
    issue_description: "Fuel injector showing wear and reduced performance on cylinders 2 & 4.",
    specialization: "Fuel System",
    severity: 4,
    status: "awaiting_parts",
    priority: 4,
    customer_satisfaction_rating: 0,
    estimated_resolution_time_minutes: 180,
    actual_resolution_time_minutes: 0,
    predictied_resolution_summary: "",
    auto_assigned: true,
    parts: [],
    assigned_to: "Maria Garcia",
    created_by: "Lisa Monroe",
    created_at: "2024-02-14T08:00:00Z",
    updated_at: "2024-02-15T10:00:00Z",
    description: "Fuel injector showing wear and reduced performance",
    diagnostic_reports: [],
  },
  {
    id: "3",
    ticket_id: "TK-003",
    assigned_technician: "Bob Wilson",
    assigned_technician_profile_id: "a1b2c3d4-5678-4abc-90de-abcdef987654",
    assigned_technician_first_name: "Bob",
    assigned_technician_last_name: "Wilson",
    title: "Electrical Panel Inspection",
    customer: "Gamma LLC",
    // product_id: "PRD-3300",
    issue_description: "Routine electrical panel inspection required per maintenance schedule.",
    specialization: "Electrical",
    severity: 3,
    status: "open",
    priority: 3,
    customer_satisfaction_rating: 0,
    estimated_resolution_time_minutes: 60,
    actual_resolution_time_minutes: 0,
    predictied_resolution_summary: "",
    auto_assigned: true,
    parts: [],
    assigned_to: "Bob Wilson",
    created_by: "Lisa Monroe",
    created_at: "2024-02-13T14:00:00Z",
    updated_at: "2024-02-13T14:00:00Z",
    description: "Routine electrical inspection required",
    diagnostic_reports: [],
  },
  {
    id: "4",
    ticket_id: "TK-004",
    assigned_technician: "John Smith",
    assigned_technician_profile_id: "e9d2a3f4-12ab-4c56-b789-123456abcdef",
    assigned_technician_first_name: "John",
    assigned_technician_last_name: "Smith",
    title: "Oil Pressure Drop",
    customer: "Delta Co",
    // product_id: "PRD-1102",
    issue_description: "Oil pressure dropping below threshold during normal operation.",
    specialization: "Engine",
    severity: 4,
    status: "assigned",
    priority: 4,
    customer_satisfaction_rating: 0,
    estimated_resolution_time_minutes: 90,
    actual_resolution_time_minutes: 0,
    predictied_resolution_summary: "",
    auto_assigned: true,
    parts: [],
    assigned_to: "John Smith",
    created_by: "James Porter",
    created_at: "2024-02-12T10:00:00Z",
    updated_at: "2024-02-12T10:00:00Z",
    description: "Oil pressure dropping below threshold during operation",
    diagnostic_reports: [],
  },
  {
    id: "5",
    ticket_id: "TK-005",
    assigned_technician: "Maria Garcia",
    assigned_technician_profile_id: "f3a1b2c4-56de-4a12-b789-abcdef123456",
    assigned_technician_first_name: "Maria",
    assigned_technician_last_name: "Garcia",
    title: "Coolant Leak Repair",
    customer: "Acme Corp",
    // product_id: "PRD-5500",
    issue_description: "Coolant leak detected at manifold connection point.",
    specialization: "Cooling",
    severity: 3,
    status: "completed",
    priority: 3,
    customer_satisfaction_rating: 5,
    estimated_resolution_time_minutes: 120,
    actual_resolution_time_minutes: 110,
    predictied_resolution_summary: "",
    auto_assigned: true,
    parts: [],
    assigned_to: "Maria Garcia",
    created_by: "James Porter",
    created_at: "2024-02-10T09:00:00Z",
    updated_at: "2024-02-11T15:00:00Z",
    description: "Coolant leak detected at manifold connection",
    diagnostic_reports: [],
  },
];

let mockTickets = [...MOCK_TICKETS];

export const ticketApi = {
  getAll: async (params?: Record<string, string>): Promise<Ticket[]> => {
    try {
      const { data } = await api.get('/tickets/', { params });
      const list = unwrapList(data);
      return list.map(normalizeTicket);
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403) throw error;
      return mockTickets;
    }
  },
  getById: async (id: string): Promise<Ticket> => {
    try {
      const { data } = await api.get(`/tickets/${id}/`);
      return normalizeTicket(data);
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403) throw error;
      const t = mockTickets.find(t => t.id === id);
      if (!t) throw new Error('Ticket not found');
      return t;
    }
  },
  create: async (payload: Partial<Ticket>): Promise<Ticket> => {
    try {
      const { data } = await api.post('/tickets/', payload);
      return normalizeTicket(data);
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403) throw error;
      // Fallback: create a mock ticket
      const newTicket: Ticket = {
        id: Date.now().toString(),
        ticket_id: `TK-${String(Date.now()).slice(-3)}`,
        title: payload.title ?? '',
        customer: payload.customer ?? '',
        issue_description: payload.issue_description ?? '',
        description: payload.description ?? '',
        status: payload.status ?? 'open',
        specialization: payload.specialization ?? '',
        priority: payload.priority ?? 2,
        severity: payload.severity ?? 3,
        assigned_to: payload.assigned_to ?? '',
        assigned_technician: payload.assigned_technician ?? '',
        assigned_technician_profile_id: payload.assigned_technician_profile_id ?? '',
        assigned_technician_first_name: payload.assigned_technician_first_name ?? '',
        assigned_technician_last_name: payload.assigned_technician_last_name ?? '',
        customer_satisfaction_rating: payload.customer_satisfaction_rating ?? 0,
        estimated_resolution_time_minutes: payload.estimated_resolution_time_minutes ?? 0,
        actual_resolution_time_minutes: payload.actual_resolution_time_minutes ?? 0,
        predictied_resolution_summary: payload.predictied_resolution_summary ?? '',
        auto_assigned: payload.auto_assigned ?? false,
        parts: payload.parts ?? [],
        created_by: payload.created_by ?? '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        diagnostic_reports: payload.diagnostic_reports ?? [],
      };
  
      // Add the new ticket to mockTickets array
      mockTickets = [newTicket, ...mockTickets];
  
      return newTicket;
    }
  },
  update: async (id: string, payload: Partial<Ticket>): Promise<Ticket> => {
    try {
      const { data } = await api.patch(`/tickets/${id}/`, payload);
      return normalizeTicket(data);
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403) throw error;
      const idx = mockTickets.findIndex(t => t.id === id);
      if (idx !== -1) {
        mockTickets[idx] = { ...mockTickets[idx], ...payload, updated_at: new Date().toISOString() };
        return mockTickets[idx];
      }
      throw new Error('Ticket not found');
    }
  },
  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/tickets/${id}/`);
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 401 || status === 403) throw error;
      mockTickets = mockTickets.filter(t => t.id !== id);
    }
  },
};
