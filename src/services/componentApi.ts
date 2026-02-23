import { api } from './apiClient';

export interface Component {
  id: number;
  name: string;
  component_number: string;
  group: string;
  description: string;
  // engine_model: string;
  parts_count: number;
  quantity_available: number;
  status: 'active' | 'discontinued' | 'pending';
  created_at: string;
}

const MOCK_COMPONENTS: Component[] = [
  { id: 1, name: 'Fuel Injection System',     component_number: 'FIS-6700',  group: 'Fuel System',   description: 'Complete high-pressure fuel injection assembly for 6.7L engines', parts_count:2,     quantity_available: 14, status: 'active',       created_at: '2022-03-15' },
  { id: 2, name: 'Engine Cooling Assembly',   component_number: 'ECA-0880',  group: 'Cooling',       description: 'Radiator, thermostat, and coolant hose group for ISX15',             parts_count:2,   quantity_available: 9,  status: 'active',       created_at: '2022-05-20' },
  { id: 3, name: 'Electrical Control Module', component_number: 'ECM-5500',  group: 'Electrical',    description: 'Engine ECM and associated wiring harness assembly',                  parts_count:2,     quantity_available: 6,  status: 'active',       created_at: '2022-07-01' },
  { id: 4, name: 'Lubrication System Group',  component_number: 'LSG-1100',  group: 'Lubrication',   description: 'Oil pump, filter housing, and pressure regulator assembly',          parts_count:2,     quantity_available: 11, status: 'active',       created_at: '2023-01-10' },
  { id: 5, name: 'Turbocharger Assembly',     component_number: 'TCA-2200',  group: 'Air Intake',    description: 'Turbocharger, intercooler pipe, and boost control valve group',      parts_count:2,     quantity_available: 7,  status: 'pending',      created_at: '2023-06-22' },
  { id: 6, name: 'Drive Belt System',         component_number: 'DBS-3300',  group: 'Drive System',  description: 'Serpentine belt, tensioner, and idler pulley group',                 parts_count:2,     quantity_available: 5,  status: 'active',       created_at: '2022-09-14' },
  { id: 7, name: 'Starter & Alternator',      component_number: 'SAA-4400',  group: 'Electrical',    description: 'Starter motor, alternator, and battery charging system assembly',     parts_count:2,    quantity_available: 4,  status: 'discontinued', created_at: '2021-11-05' },
];

let mockComponents = [...MOCK_COMPONENTS];

export const componentApi = {
  getAll: async (): Promise<Component[]> => {
    try {
      const { data } = await api.get('/components/');
      return data.results || data;
    } catch {
      return mockComponents;
    }
  },
  getById: async (id: number): Promise<Component> => {
    try {
      const { data } = await api.get(`/components/${id}/`);
      return data;
    } catch {
      const c = mockComponents.find(c => c.id === id);
      if (!c) throw new Error('Component not found');
      return c;
    }
  },
  create: async (payload: Partial<Component>): Promise<Component> => {
    try {
      const { data } = await api.post('/components/', payload);
      return data;
    } catch {
      const newComp: Component = {
        id: Date.now(),
        name: payload.name ?? '',
        component_number: payload.component_number ?? '',
        group: payload.group ?? '',
        description: payload.description ?? '',
        // engine_model: payload.engine_model ?? '',
        parts_count: payload.parts_count ?? 1,
        quantity_available: 0,
        status: 'active',
        created_at: new Date().toISOString().split('T')[0],
      };
      mockComponents = [newComp, ...mockComponents];
      return newComp;
    }
  },
  update: async (id: number, payload: Partial<Component>): Promise<Component> => {
    try {
      const { data } = await api.patch(`/components/${id}/`, payload);
      return data;
    } catch {
      const idx = mockComponents.findIndex(c => c.id === id);
      if (idx !== -1) {
        mockComponents[idx] = { ...mockComponents[idx], ...payload };
        return mockComponents[idx];
      }
      throw new Error('Component not found');
    }
  },
};
