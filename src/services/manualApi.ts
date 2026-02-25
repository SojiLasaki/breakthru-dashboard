import { api } from './apiClient';

// ── Nested M2M types matching Django models ──────────────────────────────────

export interface ManualTag {
  id: string;
  name: string;
  created_at: string;
}

export interface ManualComponent {
  id: number;
  name: string;
  component_number: string;
  group: string;
}

export interface ManualPart {
  id: number;
  part_number: string;
  name: string;
  category: string;
}

export interface ManualImage {
  id: string;
  image: string; // URL
  caption: string;
  created_at: string;
}

export interface Manual {
  id: string; // UUID
  title: string;
  description: string;
  category: string;
  file: string | null; // PDF URL from FileField
  version: string;
  content: string;
  updated_at: string;
  created_at: string;
  created_by: {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
  };
  component: ManualComponent[];
  parts_needed: ManualPart[];
  tags: ManualTag[];
  images: ManualImage[];
  file_size?: number; // bytes – may come from serializer
}

export interface CreateManualInput {
  title: string;
  description: string;
  category: string;
  version: string;
  content?: string;
  component_ids?: number[];
  tag_ids?: string[];
  file?: File;
}

// ── Mock data (UUID ids, nested objects) ──────────────────────────────────────

const MOCK_TAGS: ManualTag[] = [
  { id: 'tag-1', name: 'maintenance', created_at: '2023-01-01' },
  { id: 'tag-2', name: 'service', created_at: '2023-01-01' },
  { id: 'tag-3', name: 'ISX15', created_at: '2023-01-01' },
  { id: 'tag-4', name: 'diesel', created_at: '2023-01-01' },
  { id: 'tag-5', name: 'diagnostics', created_at: '2023-01-01' },
  { id: 'tag-6', name: 'fault-codes', created_at: '2023-01-01' },
  { id: 'tag-7', name: 'QSK60', created_at: '2023-01-01' },
  { id: 'tag-8', name: 'electrical', created_at: '2023-01-01' },
  { id: 'tag-9', name: 'wiring', created_at: '2023-01-01' },
  { id: 'tag-10', name: 'fuel', created_at: '2023-01-01' },
  { id: 'tag-11', name: 'cooling', created_at: '2023-01-01' },
  { id: 'tag-12', name: 'generator', created_at: '2023-01-01' },
  { id: 'tag-13', name: 'commissioning', created_at: '2023-01-01' },
  { id: 'tag-14', name: 'C175', created_at: '2023-01-01' },
  { id: 'tag-15', name: 'recommended', created_at: '2023-01-01' },
];

const MOCK_COMPONENTS: ManualComponent[] = [
  { id: 1, name: 'Fuel Injection System', component_number: 'FIS-6700', group: 'Fuel System' },
  { id: 2, name: 'Engine Cooling Assembly', component_number: 'ECA-0880', group: 'Cooling' },
  { id: 3, name: 'Electrical Control Module', component_number: 'ECM-5500', group: 'Electrical' },
  { id: 5, name: 'Turbocharger Assembly', component_number: 'TCA-2200', group: 'Air Intake' },
];

const MOCK_PARTS: ManualPart[] = [
  { id: 1, part_number: 'FI-4021-A', name: 'Fuel Injector 6.7L', category: 'Fuel System' },
  { id: 4, part_number: 'EC-0881-A', name: 'Thermostat 82°C', category: 'Cooling' },
  { id: 7, part_number: 'EL-5501-A', name: 'Alternator 24V 120A', category: 'Electrical' },
  { id: 8, part_number: 'EL-5502-B', name: 'ECM Control Unit', category: 'Electrical' },
];

const PROFILE_CUMMINS = { id: 1, first_name: 'Cummins', last_name: 'Engineering', username: 'cummins_eng' };

let MOCK_MANUALS: Manual[] = [
  {
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    title: 'ISX15 Engine Service Manual',
    description: 'Complete service procedures for ISX15 diesel engine',
    category: 'Engine',
    file: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    version: 'Rev. 12',
    updated_at: '2024-01-15',
    created_at: '2023-01-15',
    created_by: PROFILE_CUMMINS,
    component: [MOCK_COMPONENTS[3], MOCK_COMPONENTS[0]],
    parts_needed: [MOCK_PARTS[0]],
    tags: [MOCK_TAGS[0], MOCK_TAGS[1], MOCK_TAGS[2], MOCK_TAGS[3]],
    images: [
      { id: 'img-1', image: 'https://placehold.co/800x500/1a1f36/ffffff?text=ISX15+Diagram', caption: 'ISX15 cutaway diagram', created_at: '2023-01-15' },
      { id: 'img-2', image: 'https://placehold.co/800x500/1a1f36/ffffff?text=Turbo+Assembly', caption: 'Turbocharger assembly view', created_at: '2023-01-15' },
    ],
    content: 'This manual covers complete overhaul and service procedures for the ISX15 engine platform.\n\n## Safety Precautions\nAlways disconnect battery before servicing electrical components.\n\n## Service Intervals\n- Oil change: every 15,000 miles\n- Fuel filter: every 30,000 miles\n- Coolant flush: every 60,000 miles',
    file_size: 2457600,
  },
  {
    id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    title: 'QSK60 Troubleshooting Guide',
    description: 'Fault code diagnostics and troubleshooting for QSK60',
    category: 'Engine',
    file: 'https://www.africau.edu/images/default/sample.pdf',
    version: 'Rev. 8',
    updated_at: '2024-02-01',
    created_at: '2023-06-01',
    created_by: PROFILE_CUMMINS,
    component: [MOCK_COMPONENTS[2]],
    parts_needed: [MOCK_PARTS[2], MOCK_PARTS[3]],
    tags: [MOCK_TAGS[4], MOCK_TAGS[5], MOCK_TAGS[6]],
    images: [],
    content: 'Fault code reference guide for QSK60 engines. Cross-reference fault codes with the diagnostic tree.',
    file_size: 1843200,
  },
  {
    id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
    title: 'Electrical Systems Handbook',
    description: 'Wiring diagrams and electrical troubleshooting procedures',
    category: 'Electrical',
    file: 'https://www.orimi.com/pdf-test.pdf',
    version: 'Rev. 5',
    updated_at: '2023-12-10',
    created_at: '2022-12-10',
    created_by: PROFILE_CUMMINS,
    component: [MOCK_COMPONENTS[2]],
    parts_needed: [MOCK_PARTS[2], MOCK_PARTS[3]],
    tags: [MOCK_TAGS[7], MOCK_TAGS[8]],
    images: [
      { id: 'img-3', image: 'https://placehold.co/800x500/1a1f36/ffffff?text=Wiring+Diagram', caption: 'Main wiring harness schematic', created_at: '2022-12-10' },
    ],
    content: 'Complete wiring diagram reference and electrical troubleshooting guide for all Cummins engine platforms.',
    file_size: 3145728,
  },
  {
    id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
    title: 'Fuel System Maintenance Guide',
    description: 'Fuel injection system maintenance and calibration',
    category: 'Fuel System',
    file: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    version: 'Rev. 7',
    updated_at: '2024-01-20',
    created_at: '2023-01-20',
    created_by: PROFILE_CUMMINS,
    component: [MOCK_COMPONENTS[0]],
    parts_needed: [MOCK_PARTS[0]],
    tags: [MOCK_TAGS[9], MOCK_TAGS[0]],
    images: [],
    content: 'Detailed maintenance and calibration procedures for the fuel injection system on ISB6.7 engines.',
    file_size: 1024000,
  },
  {
    id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
    title: 'Cooling System Procedures',
    description: 'Coolant system flushing, inspection, and maintenance',
    category: 'Cooling',
    file: 'https://www.africau.edu/images/default/sample.pdf',
    version: 'Rev. 4',
    updated_at: '2023-11-15',
    created_at: '2022-11-15',
    created_by: PROFILE_CUMMINS,
    component: [MOCK_COMPONENTS[1]],
    parts_needed: [MOCK_PARTS[1]],
    tags: [MOCK_TAGS[10], MOCK_TAGS[0]],
    images: [],
    content: 'Step-by-step procedures for coolant system maintenance including flushing, pressure testing, and component inspection.',
    file_size: 768000,
  },
  {
    id: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
    title: 'Generator Commissioning Manual',
    description: 'Step-by-step generator setup and commissioning guide',
    category: 'Generator',
    file: 'https://www.orimi.com/pdf-test.pdf',
    version: 'Rev. 3',
    updated_at: '2024-02-10',
    created_at: '2023-02-10',
    created_by: PROFILE_CUMMINS,
    component: [],
    parts_needed: [],
    tags: [MOCK_TAGS[11], MOCK_TAGS[12], MOCK_TAGS[13]],
    images: [],
    content: 'Complete commissioning guide for C175 generator sets. Covers pre-start inspection, first-run procedures, and load testing protocols.',
    file_size: 2097152,
  },
];

let nextMockId = 7;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '—';
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// ── API service ──────────────────────────────────────────────────────────────

export const manualApi = {
  getAll: async (params?: { search?: string; category?: string; component?: number; tag?: string }): Promise<Manual[]> => {
    try {
      const { data } = await api.get('/manuals/', { params });
      return data.results || data;
    } catch {
      let results = MOCK_MANUALS;
      if (params?.search) {
        const q = params.search.toLowerCase();
        results = results.filter(m =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
        );
      }
      if (params?.category) results = results.filter(m => m.category === params.category);
      if (params?.component) results = results.filter(m => m.component.some(c => c.id === params.component));
      if (params?.tag) results = results.filter(m => m.tags.some(t => t.name === params.tag));
      return results;
    }
  },

  getById: async (id: string): Promise<Manual> => {
    try {
      const { data } = await api.get(`/manuals/${id}/`);
      return data;
    } catch {
      const m = MOCK_MANUALS.find(m => m.id === id);
      if (!m) throw new Error('Manual not found');
      return m;
    }
  },

  create: async (input: CreateManualInput): Promise<Manual> => {
    try {
      const formData = new FormData();
      formData.append('title', input.title);
      formData.append('description', input.description);
      formData.append('category', input.category);
      formData.append('version', input.version);
      if (input.content) formData.append('content', input.content);
      if (input.file) formData.append('file', input.file);
      input.component_ids?.forEach(id => formData.append('component_ids', String(id)));
      input.tag_ids?.forEach(id => formData.append('tag_ids', id));
      const { data } = await api.post('/manuals/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    } catch {
      const newManual: Manual = {
        id: `mock-${nextMockId++}`,
        title: input.title,
        description: input.description,
        category: input.category,
        version: input.version || 'Rev. 1',
        file: null,
        updated_at: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString().split('T')[0],
        created_by: { id: 99, first_name: 'Current', last_name: 'User', username: 'current_user' },
        content: input.content || '',
        component: [],
        parts_needed: [],
        tags: [],
        images: [],
        file_size: 0,
      };
      MOCK_MANUALS = [newManual, ...MOCK_MANUALS];
      return newManual;
    }
  },

  /** Download ZIP bundle (PDF + images + metadata) */
  downloadZip: async (id: string, title: string): Promise<void> => {
    try {
      const response = await api.get(`/manuals/${id}/download-zip/`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      throw new Error('ZIP download is not available in demo mode.');
    }
  },

  /** Check manual version for sync comparison */
  getVersion: async (id: string): Promise<{ version: string; updated_at: string }> => {
    try {
      const { data } = await api.get(`/manuals/${id}/version/`);
      return data;
    } catch {
      const m = MOCK_MANUALS.find(m => m.id === id);
      return { version: m?.version ?? '', updated_at: m?.updated_at ?? '' };
    }
  },

  /** Get all available tags */
  getTags: async (): Promise<ManualTag[]> => {
    try {
      const { data } = await api.get('/tags/');
      return data.results || data;
    } catch {
      return MOCK_TAGS;
    }
  },
};

export { formatFileSize };
