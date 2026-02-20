import { api } from './apiClient';

export interface Manual {
  id: number;
  title: string;
  description: string;
  category: string;
  file_url: string;
  version: string;
  updated_at: string;
  engine_model: string;
  author?: string;
}

export interface CreateManualInput {
  title: string;
  description: string;
  category: string;
  engine_model: string;
  version: string;
  content?: string;
}

// In-memory store so new entries persist during session
let MOCK_MANUALS: Manual[] = [
  { id: 1, title: 'ISX15 Engine Service Manual',      description: 'Complete service procedures for ISX15 diesel engine',              category: 'Engine',      file_url: '#', version: 'Rev. 12', updated_at: '2024-01-15', engine_model: 'ISX15',      author: 'Cummins Engineering' },
  { id: 2, title: 'QSK60 Troubleshooting Guide',      description: 'Fault code diagnostics and troubleshooting for QSK60',             category: 'Engine',      file_url: '#', version: 'Rev. 8',  updated_at: '2024-02-01', engine_model: 'QSK60',      author: 'Cummins Engineering' },
  { id: 3, title: 'Electrical Systems Handbook',      description: 'Wiring diagrams and electrical troubleshooting procedures',        category: 'Electrical',  file_url: '#', version: 'Rev. 5',  updated_at: '2023-12-10', engine_model: 'All Models', author: 'Cummins Engineering' },
  { id: 4, title: 'Fuel System Maintenance Guide',    description: 'Fuel injection system maintenance and calibration',                category: 'Fuel System', file_url: '#', version: 'Rev. 7',  updated_at: '2024-01-20', engine_model: 'ISB6.7',     author: 'Cummins Engineering' },
  { id: 5, title: 'Cooling System Procedures',        description: 'Coolant system flushing, inspection, and maintenance',             category: 'Cooling',     file_url: '#', version: 'Rev. 4',  updated_at: '2023-11-15', engine_model: 'All Models', author: 'Cummins Engineering' },
  { id: 6, title: 'Generator Commissioning Manual',   description: 'Step-by-step generator setup and commissioning guide',             category: 'Generator',   file_url: '#', version: 'Rev. 3',  updated_at: '2024-02-10', engine_model: 'C175',       author: 'Cummins Engineering' },
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
        file_url: '#',
        updated_at: new Date().toISOString().split('T')[0],
        author: authorName,
      };
      MOCK_MANUALS = [newManual, ...MOCK_MANUALS];
      return newManual;
    }
  },
};
