import { api } from './apiClient';

export interface Diagnostic {
  id: string;
  diagnostic_id: string;
  // ticket_id: string;
  // ticket_title: string;
  specialization: string;
  expertise_requirement: string;
  ai_summary: string;
  probable_cause: string;
  recommended_actions: string;
  confidence_score: number;
  identified_at: string;
  created_at: string;
  component_name: string;
  component_id: string;
  company_name: string;
  assigned_technician: string | null;
  customer_first_name: string;
  customer_last_name: string;
  customer_street_address: string;
  customer_street_address_2: string | null;
  customer_city: string;
  customer_state: string;
  customer_country: string;
  customer_postal_code: string;
  status: string;
  severity: string;
  // legacy fields kept for compatibility
  title: string;
  part_name: string;
  part_id: string;
  fault_code: string;
  description: string;
  recommended_action: string;
  performed_by: string;
  resolved_at: string | null;
}

const MOCK_DIAGNOSTICS: Diagnostic[] = [
  {
    id: '1',
    assigned_technician: 'John Doe',
    diagnostic_id: 'DX-001',
    specialization: 'Engine',
    expertise_requirement: 'Senior',
    ai_summary: 'Coolant temperature sensor reading above threshold (105°C). Engine entering protection mode. Likely thermostat failure or coolant system blockage.',
    probable_cause: 'Thermostat failure causing insufficient coolant flow under load.',
    recommended_actions: 'Inspect cooling system. Check coolant level. Verify thermostat operation. Replace thermostat if stuck closed.',
    confidence_score: 92,
    identified_at: '2024-02-15T08:45:00Z',
    created_at: '2024-02-15T09:00:00Z',
    component_name: 'Generator Unit #4',
    component_id: '1',
    company_name: 'Acme Corp',

    customer_first_name: 'Michael',
    customer_last_name: 'Johnson',
    customer_street_address: '1200 Main Street',
    customer_street_address_2: null,
    customer_city: 'Houston',
    customer_state: 'TX',
    customer_country: 'USA',
    customer_postal_code: '77001',

    status: 'in_progress',
    severity: 'critical',

    title: 'Engine Overheat Warning',
    part_name: 'Thermostat',
    part_id: 'P-001',
    fault_code: 'E-2301',
    description: 'Coolant temperature sensor reading above threshold (105°C). Engine entering protection mode.',
    recommended_action: 'Inspect cooling system and replace thermostat if faulty.',
    performed_by: 'AI Diagnostic Agent',
    resolved_at: null,
  },

  {
    id: '2',
    assigned_technician: 'John Smith',
    diagnostic_id: 'DX-002',
    specialization: 'Engine',
    expertise_requirement: 'Mid',
    ai_summary: 'Oil pressure reading 18 PSI below minimum threshold during normal operation. Possible oil pump wear or relief valve issue.',
    probable_cause: 'Oil pump wear causing reduced pressure output.',
    recommended_actions: 'Check oil level and quality. Inspect oil pump. Inspect pressure relief valve.',
    confidence_score: 78,
    identified_at: '2024-02-14T10:30:00Z',
    created_at: '2024-02-14T11:00:00Z',
    component_name: 'Engine Unit #2',
    component_id: '2',
    company_name: 'Delta Co',

    customer_first_name: 'Sarah',
    customer_last_name: 'Williams',
    customer_street_address: '450 Industrial Blvd',
    customer_street_address_2: 'Suite 200',
    customer_city: 'Dallas',
    customer_state: 'TX',
    customer_country: 'USA',
    customer_postal_code: '75201',

    status: 'pending',
    severity: 'warning',

    title: 'Oil Pressure Low',
    part_name: 'Oil Pump',
    part_id: 'P-002',
    fault_code: 'E-1102',
    description: 'Oil pressure reading 18 PSI below minimum threshold during normal operation.',
    recommended_action: 'Inspect oil pump and verify pressure output.',
    performed_by: 'John Smith',
    resolved_at: null,
  },

  {
    id: '3',
    assigned_technician: 'Maria Garcia',
    diagnostic_id: 'DX-003',
    specialization: 'Fuel System',
    expertise_requirement: 'Senior',
    ai_summary: 'Irregular fuel consumption detected. Injector spray pattern analysis shows degradation on cylinders 2 and 4.',
    probable_cause: 'Injector nozzle wear causing poor atomization.',
    recommended_actions: 'Replace fuel injectors on cylinders 2 and 4. Perform fuel system pressure test after replacement.',
    confidence_score: 95,
    identified_at: '2024-02-12T13:00:00Z',
    created_at: '2024-02-12T14:00:00Z',
    component_name: 'Generator Unit #1',
    component_id: '3',
    company_name: 'Beta Industries',

    customer_first_name: 'Carlos',
    customer_last_name: 'Ramirez',
    customer_street_address: '900 Commerce Street',
    customer_street_address_2: null,
    customer_city: 'San Antonio',
    customer_state: 'TX',
    customer_country: 'USA',
    customer_postal_code: '78205',

    status: 'resolved',
    severity: 'warning',

    title: 'Fuel System Anomaly',
    part_name: 'Fuel Injector',
    part_id: 'P-003',
    fault_code: 'F-0501',
    description: 'Irregular fuel consumption detected. Possible injector wear.',
    recommended_action: 'Replace affected fuel injectors.',
    performed_by: 'Maria Garcia',
    resolved_at: '2024-02-13T10:00:00Z',
  },

  {
    id: '4',
    assigned_technician: 'Bob Wilson',
    diagnostic_id: 'DX-004',
    specialization: 'Electrical',
    expertise_requirement: 'Junior',
    ai_summary: 'ECM reporting a non-critical fault. Alternator output at low end of specification range.',
    probable_cause: 'Alternator brush wear reducing output efficiency.',
    recommended_actions: 'Monitor alternator output. Schedule inspection within 30 days.',
    confidence_score: 65,
    identified_at: '2024-02-11T07:30:00Z',
    created_at: '2024-02-11T08:00:00Z',
    component_name: 'Engine Unit #3',
    component_id: '4',
    company_name: 'Gamma LLC',

    customer_first_name: 'Emily',
    customer_last_name: 'Brown',
    customer_street_address: '300 Tech Park Drive',
    customer_street_address_2: null,
    customer_city: 'Austin',
    customer_state: 'TX',
    customer_country: 'USA',
    customer_postal_code: '73301',

    status: 'pending',
    severity: 'info',

    title: 'Electrical Fault Code',
    part_name: 'Alternator',
    part_id: 'P-004',
    fault_code: 'EL-800',
    description: 'ECM reporting a non-critical fault. Alternator output at low end of specification.',
    recommended_action: 'Monitor alternator and schedule maintenance.',
    performed_by: 'AI Diagnostic Agent',
    resolved_at: null,
  },

  {
    id: '5',
    assigned_technician: 'Bob Wilson',
    diagnostic_id: 'DX-005',
    specialization: 'Electrical',
    expertise_requirement: 'Senior',
    ai_summary: 'Turbocharger boost pressure 40% below nominal. Analysis indicates possible bearing failure or seal leak.',
    probable_cause: 'Turbocharger bearing failure causing reduced boost pressure.',
    recommended_actions: 'Remove and inspect turbocharger. Replace if bearing play exceeds 0.5mm.',
    confidence_score: 88,
    identified_at: '2024-02-10T14:15:00Z',
    created_at: '2024-02-10T15:00:00Z',
    component_name: 'Generator Unit #5',
    component_id: '5',
    company_name: 'Beta Industries',

    customer_first_name: 'David',
    customer_last_name: 'Martinez',
    customer_street_address: '700 Logistics Way',
    customer_street_address_2: null,
    customer_city: 'San Antonio',
    customer_state: 'TX',
    customer_country: 'USA',
    customer_postal_code: '78207',

    status: 'failed',
    severity: 'critical',

    title: 'Turbocharger Boost Loss',
    part_name: 'Turbocharger Assembly',
    part_id: 'P-005',
    fault_code: 'T-3301',
    description: 'Turbocharger boost pressure 40% below nominal. Possible bearing failure or seal leak.',
    recommended_action: 'Inspect and replace turbocharger if required.',
    performed_by: 'Bob Wilson',
    resolved_at: null,
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
  getById: async (id: string): Promise<Diagnostic> => {
    try {
      const { data } = await api.get(`/diagnostics/${id}/`);
      return data;
    } catch {
      const d = mockDiagnostics.find(d => d.id === id);
      if (!d) throw new Error('Diagnostic not found');
      return d;
    }
  },
  update: async (id: string, payload: Partial<Diagnostic>): Promise<Diagnostic> => {
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
