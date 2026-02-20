import { api } from './apiClient';

export interface Ticket {
  id: number;
  ticket_id: string;
  title: string;
  status: 'open' | 'in_progress' | 'closed' | 'urgent';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assigned_technician: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  description: string;
  category: string;
}

const MOCK_TICKETS: Ticket[] = [
  { id: 1, ticket_id: 'TK-001', title: 'Engine Overheating - Unit #4',   status: 'urgent',      priority: 'critical', assigned_technician: 'John Smith',   created_by: 'James Porter', created_at: '2024-02-15T09:00:00Z', updated_at: '2024-02-15T11:00:00Z', description: 'Engine temperature exceeding safe limits', category: 'Engine' },
  { id: 2, ticket_id: 'TK-002', title: 'Fuel Injector Replacement',       status: 'in_progress', priority: 'high',     assigned_technician: 'Maria Garcia', created_by: 'Lisa Monroe',  created_at: '2024-02-14T08:00:00Z', updated_at: '2024-02-15T10:00:00Z', description: 'Fuel injector showing wear and reduced performance', category: 'Fuel System' },
  { id: 3, ticket_id: 'TK-003', title: 'Electrical Panel Inspection',     status: 'open',        priority: 'medium',   assigned_technician: 'Bob Wilson',   created_by: 'Lisa Monroe',  created_at: '2024-02-13T14:00:00Z', updated_at: '2024-02-13T14:00:00Z', description: 'Routine electrical inspection required', category: 'Electrical' },
  { id: 4, ticket_id: 'TK-004', title: 'Oil Pressure Drop',               status: 'open',        priority: 'high',     assigned_technician: 'John Smith',   created_by: 'James Porter', created_at: '2024-02-12T10:00:00Z', updated_at: '2024-02-12T10:00:00Z', description: 'Oil pressure dropping below threshold during operation', category: 'Engine' },
  { id: 5, ticket_id: 'TK-005', title: 'Coolant Leak Repair',             status: 'closed',      priority: 'medium',   assigned_technician: 'Maria Garcia', created_by: 'James Porter', created_at: '2024-02-10T09:00:00Z', updated_at: '2024-02-11T15:00:00Z', description: 'Coolant leak detected at manifold connection', category: 'Cooling' },
  { id: 6, ticket_id: 'TK-006', title: 'Generator Load Test',             status: 'in_progress', priority: 'low',      assigned_technician: 'Bob Wilson',   created_by: 'Lisa Monroe',  created_at: '2024-02-09T13:00:00Z', updated_at: '2024-02-15T09:00:00Z', description: 'Scheduled load test for annual maintenance', category: 'Generator' },
  { id: 7, ticket_id: 'TK-007', title: 'Starter Motor Fault',             status: 'open',        priority: 'high',     assigned_technician: 'Bob Wilson',   created_by: 'James Porter', created_at: '2024-02-16T08:00:00Z', updated_at: '2024-02-16T08:00:00Z', description: 'Starter motor intermittently failing on cold starts', category: 'Electrical' },
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
  getById: async (id: number): Promise<Ticket> => {
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
      const newTicket: Ticket = {
        id: Date.now(),
        ticket_id: `TK-${String(Date.now()).slice(-3)}`,
        title: payload.title ?? '',
        description: payload.description ?? '',
        category: payload.category ?? '',
        status: payload.status ?? 'open',
        priority: payload.priority ?? 'medium',
        assigned_technician: payload.assigned_technician ?? '',
        created_by: payload.created_by ?? '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      mockTickets = [newTicket, ...mockTickets];
      return newTicket;
    }
  },
  update: async (id: number, payload: Partial<Ticket>): Promise<Ticket> => {
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
  delete: async (id: number): Promise<void> => {
    try {
      await api.delete(`/tickets/${id}/`);
    } catch {
      mockTickets = mockTickets.filter(t => t.id !== id);
    }
  },
};
