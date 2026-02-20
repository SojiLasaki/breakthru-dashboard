import { api } from './apiClient';

export interface Diagnostic {
  id: number;
  diagnostic_id: string;
  title: string;
  asset_name: string;
  asset_id: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'failed';
  severity: 'info' | 'warning' | 'critical';
  fault_code: string;
  description: string;
  recommended_action: string;
  performed_by: string;
  created_at: string;
  resolved_at: string | null;
}

const MOCK_DIAGNOSTICS: Diagnostic[] = [
  { id: 1, diagnostic_id: 'DX-001', title: 'Engine Overheat Warning',       asset_name: 'Generator Unit #4', asset_id: 1, status: 'in_progress', severity: 'critical', fault_code: 'E-2301', description: 'Coolant temperature sensor reading above threshold (105°C). Engine entering protection mode.', recommended_action: 'Inspect cooling system, check coolant level, verify thermostat operation.', performed_by: 'AI Diagnostic Agent', created_at: '2024-02-15T09:00:00Z', resolved_at: null },
  { id: 2, diagnostic_id: 'DX-002', title: 'Oil Pressure Low',              asset_name: 'Engine Unit #2',   asset_id: 2, status: 'pending',     severity: 'warning',  fault_code: 'E-1102', description: 'Oil pressure reading 18 PSI below minimum threshold during normal operation.',            recommended_action: 'Check oil level and quality. Inspect oil pump and pressure relief valve.',       performed_by: 'John Smith',          created_at: '2024-02-14T11:00:00Z', resolved_at: null },
  { id: 3, diagnostic_id: 'DX-003', title: 'Fuel System Anomaly',           asset_name: 'Generator Unit #1', asset_id: 3, status: 'resolved',    severity: 'warning',  fault_code: 'F-0501', description: 'Irregular fuel consumption detected. Possible injector wear.',                             recommended_action: 'Replace fuel injectors on cylinders 2 and 4.',                                   performed_by: 'Maria Garcia',        created_at: '2024-02-12T14:00:00Z', resolved_at: '2024-02-13T10:00:00Z' },
  { id: 4, diagnostic_id: 'DX-004', title: 'Electrical Fault Code',         asset_name: 'Engine Unit #3',   asset_id: 4, status: 'pending',     severity: 'info',     fault_code: 'EL-800', description: 'ECM reporting a non-critical fault. Alternator output at low end of specification.',       recommended_action: 'Monitor alternator output. Schedule inspection within 30 days.',                 performed_by: 'AI Diagnostic Agent', created_at: '2024-02-11T08:00:00Z', resolved_at: null },
  { id: 5, diagnostic_id: 'DX-005', title: 'Turbocharger Boost Loss',       asset_name: 'Generator Unit #5', asset_id: 5, status: 'failed',      severity: 'critical', fault_code: 'T-3301', description: 'Turbocharger boost pressure 40% below nominal. Possible bearing failure or seal leak.',  recommended_action: 'Remove and inspect turbocharger. Replace if bearing play exceeds 0.5mm.',        performed_by: 'Bob Wilson',          created_at: '2024-02-10T15:00:00Z', resolved_at: null },
];

let mockDiagnostics = [...MOCK_DIAGNOSTICS];

export const diagnosticsApi = {
  getAll: async (): Promise<Diagnostic[]> => {
    try {
      const { data } = await api.get('/diagnostics/');
      return data.results || data;
    } catch {
      return mockDiagnostics;
    }
  },
  getById: async (id: number): Promise<Diagnostic> => {
    try {
      const { data } = await api.get(`/diagnostics/${id}/`);
      return data;
    } catch {
      const d = mockDiagnostics.find(d => d.id === id);
      if (!d) throw new Error('Diagnostic not found');
      return d;
    }
  },
  update: async (id: number, payload: Partial<Diagnostic>): Promise<Diagnostic> => {
    try {
      const { data } = await api.patch(`/diagnostics/${id}/`, payload);
      return data;
    } catch {
      const idx = mockDiagnostics.findIndex(d => d.id === id);
      if (idx !== -1) {
        mockDiagnostics[idx] = {
          ...mockDiagnostics[idx],
          ...payload,
          resolved_at: payload.status === 'resolved' ? new Date().toISOString() : mockDiagnostics[idx].resolved_at,
        };
        return mockDiagnostics[idx];
      }
      throw new Error('Diagnostic not found');
    }
  },
};
