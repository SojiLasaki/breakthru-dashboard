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

export const componentApi = {
  getAll: async (): Promise<Component[]> => {
    try {
      const { data } = await api.get('/components/');
      return data.results || data;
    } catch {
      return MOCK_COMPONENTS;
    }
  },
};
