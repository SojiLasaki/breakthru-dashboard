import { api } from './apiClient';

export interface Transaction {
  id: number;
  order_id: number;
  part_name: string;
  quantity: number;
  total_price: number;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  ai_agent: string;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  notes: string;
}

let MOCK_TRANSACTIONS: Transaction[] = [
  { id: 1, order_id: 1001, part_name: 'Fuel Injector 6.7L',       quantity: 4,  total_price: 980.00,  status: 'approved',  ai_agent: 'DiagnostIQ',  approved_by: 'J. Morrison',   approved_at: '2026-02-19T10:24:00Z', created_at: '2026-02-19T09:00:00Z', notes: 'Urgent reorder triggered by low stock alert' },
  { id: 2, order_id: 1002, part_name: 'Oil Filter Assembly',        quantity: 10, total_price: 285.00,  status: 'approved',  ai_agent: 'DiagnostIQ',  approved_by: 'A. Reyes',      approved_at: '2026-02-19T14:15:00Z', created_at: '2026-02-19T11:30:00Z', notes: 'Routine maintenance restock' },
  { id: 3, order_id: 1003, part_name: 'Coolant Hose Kit',           quantity: 5,  total_price: 325.00,  status: 'pending',   ai_agent: 'InspectAI',   approved_by: null,            approved_at: null,                   created_at: '2026-02-20T07:00:00Z', notes: 'Predicted failure detected on ISX15 fleet' },
  { id: 4, order_id: 1004, part_name: 'ECM Control Unit',           quantity: 1,  total_price: 1250.00, status: 'pending',   ai_agent: 'DiagnostIQ',  approved_by: null,            approved_at: null,                   created_at: '2026-02-20T08:10:00Z', notes: 'Fault code SPN 639 triggered automatic order' },
  { id: 5, order_id: 1005, part_name: 'Serpentine Belt',            quantity: 8,  total_price: 360.00,  status: 'fulfilled', ai_agent: 'InspectAI',   approved_by: 'J. Morrison',   approved_at: '2026-02-18T09:00:00Z', created_at: '2026-02-17T15:00:00Z', notes: 'Preventive maintenance batch order' },
  { id: 6, order_id: 1006, part_name: 'Thermostat 82°C',            quantity: 6,  total_price: 534.00,  status: 'rejected',  ai_agent: 'DiagnostIQ',  approved_by: 'A. Reyes',      approved_at: '2026-02-18T11:00:00Z', created_at: '2026-02-18T08:30:00Z', notes: 'Rejected – sufficient stock found on re-check' },
  { id: 7, order_id: 1007, part_name: 'Alternator 24V 120A',        quantity: 2,  total_price: 1040.00, status: 'approved',  ai_agent: 'InspectAI',   approved_by: 'J. Morrison',   approved_at: '2026-02-20T08:55:00Z', created_at: '2026-02-20T08:00:00Z', notes: 'Asset downtime risk triggered automatic order' },
];

let nextId = 8;

export const transactionApi = {
  getAll: async (): Promise<Transaction[]> => {
    try {
      const { data } = await api.get('/transactions/');
      return data.results || data;
    } catch {
      return MOCK_TRANSACTIONS;
    }
  },
  getRecent: async (limit = 5): Promise<Transaction[]> => {
    try {
      const { data } = await api.get('/transactions/', { params: { limit } });
      return (data.results || data).slice(0, limit);
    } catch {
      return [...MOCK_TRANSACTIONS].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, limit);
    }
  },
  approve: async (id: number, approverName: string): Promise<Transaction> => {
    try {
      const { data } = await api.patch(`/transactions/${id}/approve/`, { approved_by: approverName });
      return data;
    } catch {
      const idx = MOCK_TRANSACTIONS.findIndex(t => t.id === id);
      if (idx !== -1) {
        MOCK_TRANSACTIONS[idx] = {
          ...MOCK_TRANSACTIONS[idx],
          status: 'approved',
          approved_by: approverName,
          approved_at: new Date().toISOString(),
        };
        return MOCK_TRANSACTIONS[idx];
      }
      throw new Error('Transaction not found');
    }
  },
  reject: async (id: number, approverName: string): Promise<Transaction> => {
    try {
      const { data } = await api.patch(`/transactions/${id}/reject/`, { approved_by: approverName });
      return data;
    } catch {
      const idx = MOCK_TRANSACTIONS.findIndex(t => t.id === id);
      if (idx !== -1) {
        MOCK_TRANSACTIONS[idx] = {
          ...MOCK_TRANSACTIONS[idx],
          status: 'rejected',
          approved_by: approverName,
          approved_at: new Date().toISOString(),
        };
        return MOCK_TRANSACTIONS[idx];
      }
      throw new Error('Transaction not found');
    }
  },
};
