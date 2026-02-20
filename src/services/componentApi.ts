import { api } from './apiClient';

export interface Component {
  id: number;
  name: string;
  code: string;
  category: string;
  description: string;
  engine_model: string;
  part_count: number;
  status: 'active' | 'discontinued' | 'pending';
  created_at: string;
}

const MOCK_COMPONENTS: Component[] = [
  { id: 1, name: 'Fuel Injection System',     code: 'FIS-6700',  category: 'Fuel System',   description: 'Complete high-pressure fuel injection assembly for 6.7L engines',    engine_model: 'ISB6.7',  part_count: 14, status: 'active',       created_at: '2022-03-15' },
  { id: 2, name: 'Engine Cooling Assembly',   code: 'ECA-0880',  category: 'Cooling',       description: 'Radiator, thermostat, and coolant hose group for ISX15',              engine_model: 'ISX15',   part_count: 9,  status: 'active',       created_at: '2022-05-20' },
  { id: 3, name: 'Electrical Control Module', code: 'ECM-5500',  category: 'Electrical',    description: 'Engine ECM and associated wiring harness assembly',                   engine_model: 'All',     part_count: 6,  status: 'active',       created_at: '2022-07-01' },
  { id: 4, name: 'Lubrication System Group',  code: 'LSG-1100',  category: 'Lubrication',   description: 'Oil pump, filter housing, and pressure regulator assembly',            engine_model: 'QSK60',   part_count: 11, status: 'active',       created_at: '2023-01-10' },
  { id: 5, name: 'Turbocharger Assembly',     code: 'TCA-2200',  category: 'Air Intake',    description: 'Turbocharger, intercooler pipe, and boost control valve group',        engine_model: 'ISX15',   part_count: 7,  status: 'pending',      created_at: '2023-06-22' },
  { id: 6, name: 'Drive Belt System',         code: 'DBS-3300',  category: 'Drive System',  description: 'Serpentine belt, tensioner, and idler pulley group',                   engine_model: 'All',     part_count: 5,  status: 'active',       created_at: '2022-09-14' },
  { id: 7, name: 'Starter & Alternator',      code: 'SAA-4400',  category: 'Electrical',    description: 'Starter motor, alternator, and battery charging system assembly',      engine_model: 'All',     part_count: 4,  status: 'discontinued', created_at: '2021-11-05' },
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
        code: payload.code ?? '',
        category: payload.category ?? '',
        description: payload.description ?? '',
        engine_model: payload.engine_model ?? '',
        part_count: 0,
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
