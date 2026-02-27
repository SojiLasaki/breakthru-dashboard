import { api } from './apiClient';

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
      return data.results || data;
    } catch {
      return mockTickets;
    }
  },
  getById: async (id: string): Promise<Ticket> => {
    try {
      const { data } = await api.get(`/tickets/${id}/`);
      return data;
    } catch {
      const t = mockTickets.find(t => t.id === id);
      if (!t) throw new Error('Ticket not found');
      return t;
    }
  },
  create: async (payload: Partial<Ticket>): Promise<Ticket> => {
    try {
      const { data } = await api.post('/tickets/', payload);
      return data;
    } catch {
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
      return data;
    } catch {
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
    } catch {
      mockTickets = mockTickets.filter(t => t.id !== id);
    }
  },
};
