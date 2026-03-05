import { api } from './apiClient';

export interface LogEntry {
  id: number;
  timestamp: string;
  action: string;
  entity_type: string;
  entity_id: string;
  performed_by: string;
  details: string;
  type: 'status_change' | 'ai_recommendation' | 'order' | 'ticket' | 'system';
}

const MOCK_LOGS: LogEntry[] = [
  { id: 1, timestamp: '2024-02-15T11:30:00Z', action: 'Ticket Status Updated', entity_type: 'Ticket', entity_id: 'TK-001', performed_by: 'John Smith', details: 'Status changed from Open to Urgent', type: 'status_change' },
  { id: 2, timestamp: '2024-02-15T10:45:00Z', action: 'AI Recommendation Generated', entity_type: 'AI', entity_id: 'TK-001', performed_by: 'AI System', details: 'Predictive analysis suggests coolant replacement within 200 operating hours', type: 'ai_recommendation' },
  { id: 3, timestamp: '2024-02-15T10:00:00Z', action: 'Order Approved', entity_type: 'Order', entity_id: 'ORD-019', performed_by: 'Admin', details: 'Fuel injector order approved for ticket TK-002', type: 'order' },
  { id: 4, timestamp: '2024-02-14T16:00:00Z', action: 'Ticket Created', entity_type: 'Ticket', entity_id: 'TK-006', performed_by: 'Customer', details: 'New maintenance ticket submitted', type: 'ticket' },
  { id: 5, timestamp: '2024-02-14T14:00:00Z', action: 'AI Recommendation Generated', entity_type: 'AI', entity_id: 'TK-004', performed_by: 'AI System', details: 'Immediate inspection recommended for low oil pressure readings', type: 'ai_recommendation' },
  { id: 6, timestamp: '2024-02-14T09:00:00Z', action: 'Technician Assigned', entity_type: 'Ticket', entity_id: 'TK-002', performed_by: 'Office Staff', details: 'Maria Garcia assigned to fuel injector replacement', type: 'status_change' },
];

const toStr = (v: unknown): string => (typeof v === 'string' && v) ? v : '';

function normalizeLogEntry(raw: any, index: number): LogEntry {
  const id = typeof raw?.id === 'number' ? raw.id : index + 1;
  const type = (['status_change', 'ai_recommendation', 'order', 'ticket', 'system'] as const).includes(raw?.type)
    ? raw.type
    : 'system';
  return {
    id,
    timestamp: toStr(raw?.timestamp ?? raw?.created_at) || new Date().toISOString(),
    action: toStr(raw?.action ?? raw?.message ?? raw?.title) || 'Event',
    entity_type: toStr(raw?.entity_type ?? raw?.entity_type_display) || '—',
    entity_id: toStr(raw?.entity_id ?? raw?.entity_id_display) || '',
    performed_by: toStr(raw?.performed_by ?? raw?.user ?? raw?.username) || 'System',
    details: toStr(raw?.details ?? raw?.description ?? raw?.summary) || '—',
    type,
  };
}

export const logApi = {
  getAll: async (): Promise<LogEntry[]> => {
    try {
      const { data } = await api.get('/logs/');
      const list = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      return list.length ? list.map((item: any, i: number) => normalizeLogEntry(item, i)) : MOCK_LOGS;
    } catch {
      return MOCK_LOGS;
    }
  },
};
