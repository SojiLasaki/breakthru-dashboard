import { api } from './apiClient';

export interface Diagnostic {
  id: number;
  diagnostic_id: string;
  ticket_id: string;
  ticket_title: string;
  specialization: string;
  expertise_requirement: string;
  ai_summary: string;
  probable_cause: string;
  recommended_actions: string;
  confidence_score: number;
  identified_at: string;
  created_at: string;
  verified_by: string;
  customer_name: string;
  customer_location: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'failed';
  severity: 'info' | 'warning' | 'critical';
  // legacy fields kept for compatibility
  title: string;
  asset_name: string;
  asset_id: number;
  fault_code: string;
  description: string;
  recommended_action: string;
  performed_by: string;
  resolved_at: string | null;
}

const MOCK_DIAGNOSTICS: Diagnostic[] = [
  {
    id: 1, diagnostic_id: 'DX-001', ticket_id: 'TK-001', ticket_title: 'Engine Overheating - Unit #4',
    specialization: 'Engine', expertise_requirement: 'Senior',
    ai_summary: 'Coolant temperature sensor reading above threshold (105°C). Engine entering protection mode. Likely thermostat failure or coolant system blockage.',
    probable_cause: 'Thermostat failure causing insufficient coolant flow under load.',
    recommended_actions: 'Inspect cooling system, check coolant level, verify thermostat operation. Replace thermostat if stuck closed.',
    confidence_score: 92, identified_at: '2024-02-15T08:45:00Z', verified_by: 'John Smith', customer_name: 'Acme Corp', customer_location: 'Houston, TX',
    status: 'in_progress', severity: 'critical',
    title: 'Engine Overheat Warning', asset_name: 'Generator Unit #4', asset_id: 1,
    fault_code: 'E-2301', description: 'Coolant temperature sensor reading above threshold (105°C). Engine entering protection mode.',
    recommended_action: 'Inspect cooling system, check coolant level, verify thermostat operation.',
    performed_by: 'AI Diagnostic Agent', created_at: '2024-02-15T09:00:00Z', resolved_at: null,
  },
  {
    id: 2, diagnostic_id: 'DX-002', ticket_id: 'TK-004', ticket_title: 'Oil Pressure Drop',
    specialization: 'Engine', expertise_requirement: 'Mid',
    ai_summary: 'Oil pressure reading 18 PSI below minimum threshold during normal operation. Possible oil pump wear or relief valve issue.',
    probable_cause: 'Oil pump wear causing reduced pressure output.',
    recommended_actions: 'Check oil level and quality. Inspect oil pump and pressure relief valve.',
    confidence_score: 78, identified_at: '2024-02-14T10:30:00Z', verified_by: 'John Smith', customer_name: 'Delta Co', customer_location: 'Dallas, TX',
    status: 'pending', severity: 'warning',
    title: 'Oil Pressure Low', asset_name: 'Engine Unit #2', asset_id: 2,
    fault_code: 'E-1102', description: 'Oil pressure reading 18 PSI below minimum threshold during normal operation.',
    recommended_action: 'Check oil level and quality. Inspect oil pump and pressure relief valve.',
    performed_by: 'John Smith', created_at: '2024-02-14T11:00:00Z', resolved_at: null,
  },
  {
    id: 3, diagnostic_id: 'DX-003', ticket_id: 'TK-002', ticket_title: 'Fuel Injector Replacement',
    specialization: 'Fuel System', expertise_requirement: 'Senior',
    ai_summary: 'Irregular fuel consumption detected. Injector spray pattern analysis shows degradation on cylinders 2 and 4.',
    probable_cause: 'Injector nozzle wear causing poor atomization.',
    recommended_actions: 'Replace fuel injectors on cylinders 2 and 4. Perform fuel system pressure test after replacement.',
    confidence_score: 95, identified_at: '2024-02-12T13:00:00Z', verified_by: 'Maria Garcia', customer_name: 'Beta Industries', customer_location: 'San Antonio, TX',
    status: 'resolved', severity: 'warning',
    title: 'Fuel System Anomaly', asset_name: 'Generator Unit #1', asset_id: 3,
    fault_code: 'F-0501', description: 'Irregular fuel consumption detected. Possible injector wear.',
    recommended_action: 'Replace fuel injectors on cylinders 2 and 4.',
    performed_by: 'Maria Garcia', created_at: '2024-02-12T14:00:00Z', resolved_at: '2024-02-13T10:00:00Z',
  },
  {
    id: 4, diagnostic_id: 'DX-004', ticket_id: 'TK-003', ticket_title: 'Electrical Panel Inspection',
    specialization: 'Electrical', expertise_requirement: 'Junior',
    ai_summary: 'ECM reporting a non-critical fault. Alternator output at low end of specification range.',
    probable_cause: 'Alternator brush wear reducing output efficiency.',
    recommended_actions: 'Monitor alternator output. Schedule inspection within 30 days.',
    confidence_score: 65, identified_at: '2024-02-11T07:30:00Z', verified_by: 'Bob Wilson', customer_name: 'Gamma LLC', customer_location: 'Austin, TX',
    status: 'pending', severity: 'info',
    title: 'Electrical Fault Code', asset_name: 'Engine Unit #3', asset_id: 4,
    fault_code: 'EL-800', description: 'ECM reporting a non-critical fault. Alternator output at low end of specification.',
    recommended_action: 'Monitor alternator output. Schedule inspection within 30 days.',
    performed_by: 'AI Diagnostic Agent', created_at: '2024-02-11T08:00:00Z', resolved_at: null,
  },
  {
    id: 5, diagnostic_id: 'DX-005', ticket_id: 'TK-007', ticket_title: 'Starter Motor Fault',
    specialization: 'Electrical', expertise_requirement: 'Senior',
    ai_summary: 'Turbocharger boost pressure 40% below nominal. Analysis indicates possible bearing failure or seal leak.',
    probable_cause: 'Turbocharger bearing failure causing reduced boost pressure.',
    recommended_actions: 'Remove and inspect turbocharger. Replace if bearing play exceeds 0.5mm.',
    confidence_score: 88, identified_at: '2024-02-10T14:15:00Z', verified_by: 'Bob Wilson', customer_name: 'Beta Industries', customer_location: 'San Antonio, TX',
    status: 'failed', severity: 'critical',
    title: 'Turbocharger Boost Loss', asset_name: 'Generator Unit #5', asset_id: 5,
    fault_code: 'T-3301', description: 'Turbocharger boost pressure 40% below nominal. Possible bearing failure or seal leak.',
    recommended_action: 'Remove and inspect turbocharger. Replace if bearing play exceeds 0.5mm.',
    performed_by: 'Bob Wilson', created_at: '2024-02-10T15:00:00Z', resolved_at: null,
  },
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
