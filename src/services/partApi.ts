import { api } from './apiClient';

export interface Part {
  id: number;
  part_number: string;
  name: string;
  component_id: number;
  component_name: string;
  category: string;
  unit_price: number;
  weight_kg: number;
  compatibility: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
  quantity_on_hand: number;
  reorder_level: number;
  supplier: string;
}

const MOCK_PARTS: Part[] = [
  { id: 1,  part_number: 'FI-4021-A', name: 'Fuel Injector 6.7L',          component_id: 1, component_name: 'Fuel Injection System',     category: 'Fuel System',   unit_price: 245.00, weight_kg: 0.4, compatibility: 'ISB6.7',   status: 'in_stock',      quantity_on_hand: 12, reorder_level: 5,  supplier: 'Cummins Direct' },
  { id: 2,  part_number: 'FI-4022-B', name: 'Injection Pump High-Press',    component_id: 1, component_name: 'Fuel Injection System',     category: 'Fuel System',   unit_price: 890.00, weight_kg: 2.1, compatibility: 'ISB6.7',   status: 'in_stock',      quantity_on_hand: 4,  reorder_level: 2,  supplier: 'Bosch' },
  { id: 3,  part_number: 'FI-4023-C', name: 'Fuel Rail Assembly',           component_id: 1, component_name: 'Fuel Injection System',     category: 'Fuel System',   unit_price: 320.00, weight_kg: 1.2, compatibility: 'ISB6.7',   status: 'low_stock',     quantity_on_hand: 2,  reorder_level: 3,  supplier: 'Bosch' },
  { id: 4,  part_number: 'EC-0881-A', name: 'Thermostat 82°C',              component_id: 2, component_name: 'Engine Cooling Assembly',   category: 'Cooling',       unit_price: 89.00,  weight_kg: 0.3, compatibility: 'ISX15',    status: 'in_stock',      quantity_on_hand: 8,  reorder_level: 4,  supplier: 'Cummins Direct' },
  { id: 5,  part_number: 'EC-0882-B', name: 'Coolant Hose Kit',             component_id: 2, component_name: 'Engine Cooling Assembly',   category: 'Cooling',       unit_price: 65.00,  weight_kg: 0.8, compatibility: 'ISX15',    status: 'low_stock',     quantity_on_hand: 1,  reorder_level: 5,  supplier: 'OEM Parts Co' },
  { id: 6,  part_number: 'EC-0883-C', name: 'Water Pump Assembly',          component_id: 2, component_name: 'Engine Cooling Assembly',   category: 'Cooling',       unit_price: 210.00, weight_kg: 1.5, compatibility: 'ISX15',    status: 'in_stock',      quantity_on_hand: 6,  reorder_level: 3,  supplier: 'Cummins Direct' },
  { id: 7,  part_number: 'EL-5501-A', name: 'Alternator 24V 120A',          component_id: 3, component_name: 'Electrical Control Module', category: 'Electrical',    unit_price: 520.00, weight_kg: 4.2, compatibility: 'All',      status: 'in_stock',      quantity_on_hand: 5,  reorder_level: 2,  supplier: 'Delco Remy' },
  { id: 8,  part_number: 'EL-5502-B', name: 'ECM Control Unit',             component_id: 3, component_name: 'Electrical Control Module', category: 'Electrical',    unit_price: 1250.00,weight_kg: 1.0, compatibility: 'ISX15',    status: 'in_stock',      quantity_on_hand: 2,  reorder_level: 1,  supplier: 'Cummins Direct' },
  { id: 9,  part_number: 'LU-1101-A', name: 'Oil Filter Assembly',          component_id: 4, component_name: 'Lubrication System Group', category: 'Lubrication',   unit_price: 28.50,  weight_kg: 0.5, compatibility: 'QSK60',    status: 'low_stock',     quantity_on_hand: 3,  reorder_level: 10, supplier: 'OEM Parts Co' },
  { id: 10, part_number: 'LU-1102-B', name: 'Oil Pressure Regulator',       component_id: 4, component_name: 'Lubrication System Group', category: 'Lubrication',   unit_price: 145.00, weight_kg: 0.6, compatibility: 'QSK60',    status: 'in_stock',      quantity_on_hand: 7,  reorder_level: 3,  supplier: 'Cummins Direct' },
  { id: 11, part_number: 'DB-3301-A', name: 'Serpentine Belt',              component_id: 6, component_name: 'Drive Belt System',        category: 'Drive System',  unit_price: 45.00,  weight_kg: 0.4, compatibility: 'All',      status: 'in_stock',      quantity_on_hand: 15, reorder_level: 5,  supplier: 'Gates Rubber' },
  { id: 12, part_number: 'DB-3302-B', name: 'Belt Tensioner Pulley',        component_id: 6, component_name: 'Drive Belt System',        category: 'Drive System',  unit_price: 85.00,  weight_kg: 0.7, compatibility: 'All',      status: 'out_of_stock',  quantity_on_hand: 0,  reorder_level: 3,  supplier: 'Gates Rubber' },
];

export const partApi = {
  getAll: async (): Promise<Part[]> => {
    try {
      const { data } = await api.get('/parts/');
      return data.results || data;
    } catch {
      return MOCK_PARTS;
    }
  },
  getByComponent: async (componentId: number): Promise<Part[]> => {
    try {
      const { data } = await api.get(`/parts/?component=${componentId}`);
      return data.results || data;
    } catch {
      return MOCK_PARTS.filter(p => p.component_id === componentId);
    }
  },
};
