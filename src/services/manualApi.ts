import { api } from './apiClient';

export interface Manual {
  id: number;
  title: string;
  description: string;
  category: string;
  file_url: string;
  version: string;
  updated_at: string;
  created_at: string;
  engine_model: string;
  author?: string;
  // New rich fields
  content?: string;
  components?: string[];
  tags?: string[];
  created_by?: string;
}

export interface CreateManualInput {
  title: string;
  description: string;
  category: string;
  engine_model: string;
  version: string;
  content?: string;
  components?: string[];
  tags?: string[];
  file_url?: string;
}

// In-memory store so new entries persist during session
let MOCK_MANUALS: Manual[] = [
  {
    id: 1, title: 'ISX15 Engine Service Manual',
    description: 'Complete service procedures for ISX15 diesel engine',
    category: 'Engine', file_url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', version: 'Rev. 12',
    updated_at: '2024-01-15', created_at: '2023-01-15',
    engine_model: 'ISX15', author: 'Cummins Engineering', created_by: 'Cummins Engineering',
    components: ['Turbocharger', 'Fuel Injectors', 'EGR Valve', 'Oil Pump'],
    tags: ['maintenance', 'service', 'ISX15', 'diesel'],
    content: 'This manual covers complete overhaul and service procedures for the ISX15 engine platform. Follow all torque specifications and safety procedures outlined in each section.\n\n## Safety Precautions\nAlways disconnect battery before servicing electrical components. Use proper lifting equipment rated for engine weight.\n\n## Service Intervals\n- Oil change: every 15,000 miles\n- Fuel filter: every 30,000 miles\n- Coolant flush: every 60,000 miles',
  },
  {
    id: 2, title: 'QSK60 Troubleshooting Guide',
    description: 'Fault code diagnostics and troubleshooting for QSK60',
    category: 'Engine', file_url: '#', version: 'Rev. 8',
    updated_at: '2024-02-01', created_at: '2023-06-01',
    engine_model: 'QSK60', author: 'Cummins Engineering', created_by: 'Cummins Engineering',
    components: ['ECM', 'Injectors', 'Sensors', 'Aftertreatment'],
    tags: ['diagnostics', 'fault-codes', 'QSK60'],
    content: 'Fault code reference guide for QSK60 engines. Cross-reference fault codes with the diagnostic tree to identify root causes quickly.',
  },
  {
    id: 3, title: 'Electrical Systems Handbook',
    description: 'Wiring diagrams and electrical troubleshooting procedures',
    category: 'Electrical', file_url: '#', version: 'Rev. 5',
    updated_at: '2023-12-10', created_at: '2022-12-10',
    engine_model: 'All Models', author: 'Cummins Engineering', created_by: 'Cummins Engineering',
    components: ['Alternator', 'Starter Motor', 'Battery', 'ECM', 'Wiring Harness'],
    tags: ['electrical', 'wiring', 'diagrams'],
    content: 'Complete wiring diagram reference and electrical troubleshooting guide for all Cummins engine platforms.',
  },
  {
    id: 4, title: 'Fuel System Maintenance Guide',
    description: 'Fuel injection system maintenance and calibration',
    category: 'Fuel System', file_url: '#', version: 'Rev. 7',
    updated_at: '2024-01-20', created_at: '2023-01-20',
    engine_model: 'ISB6.7', author: 'Cummins Engineering', created_by: 'Cummins Engineering',
    components: ['Fuel Pump', 'Injectors', 'Fuel Rail', 'Pressure Regulator'],
    tags: ['fuel', 'injection', 'calibration', 'maintenance'],
    content: 'Detailed maintenance and calibration procedures for the fuel injection system on ISB6.7 engines.',
  },
  {
    id: 5, title: 'Cooling System Procedures',
    description: 'Coolant system flushing, inspection, and maintenance',
    category: 'Cooling', file_url: '#', version: 'Rev. 4',
    updated_at: '2023-11-15', created_at: '2022-11-15',
    engine_model: 'All Models', author: 'Cummins Engineering', created_by: 'Cummins Engineering',
    components: ['Water Pump', 'Thermostat', 'Radiator', 'Coolant Lines'],
    tags: ['cooling', 'coolant', 'flush', 'overheating'],
    content: 'Step-by-step procedures for coolant system maintenance including flushing, pressure testing, and component inspection.',
  },
  {
    id: 6, title: 'Generator Commissioning Manual',
    description: 'Step-by-step generator setup and commissioning guide',
    category: 'Generator', file_url: '#', version: 'Rev. 3',
    updated_at: '2024-02-10', created_at: '2023-02-10',
    engine_model: 'C175', author: 'Cummins Engineering', created_by: 'Cummins Engineering',
    components: ['AVR', 'Exciter', 'Governor', 'Control Panel', 'Load Bank'],
    tags: ['generator', 'commissioning', 'C175', 'setup'],
    content: 'Complete commissioning guide for C175 generator sets. Covers pre-start inspection, first-run procedures, and load testing protocols.',
  },
];

let nextId = 7;

export const manualApi = {
  getAll: async (search?: string): Promise<Manual[]> => {
    try {
      const { data } = await api.get('/manuals/', { params: search ? { search } : {} });
      return data.results || data;
    } catch {
      if (search) {
        return MOCK_MANUALS.filter(m =>
          m.title.toLowerCase().includes(search.toLowerCase()) ||
          m.description.toLowerCase().includes(search.toLowerCase()) ||
          m.category.toLowerCase().includes(search.toLowerCase())
        );
      }
      return MOCK_MANUALS;
    }
  },

  create: async (input: CreateManualInput, authorName: string): Promise<Manual> => {
    try {
      const { data } = await api.post('/manuals/', { ...input, author: authorName });
      return data;
    } catch {
      const newManual: Manual = {
        id: nextId++,
        title: input.title,
        description: input.description,
        category: input.category,
        engine_model: input.engine_model,
        version: input.version || 'Rev. 1',
        file_url: input.file_url || '#',
        updated_at: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString().split('T')[0],
        author: authorName,
        created_by: authorName,
        content: input.content,
        components: input.components,
        tags: input.tags,
      };
      MOCK_MANUALS = [newManual, ...MOCK_MANUALS];
      return newManual;
    }
  },
};
