import { api } from './apiClient';

export interface Part {
  id: number;
  part_number: string;
  name: string;
  component_id?: number;
  component_name?: string;
  components: string;
  category: string;
  cost_price: number;
  resale_price: number;
  weight_kg: number;
  compatibility: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'discontinued';
  quantity_available: number;
  reorder_threshold: number;
  supplier: string;
  last_ordered?: string;
}

const MOCK_PARTS: Part[] = [
  { id: 1,  part_number: 'FI-4021-A', name: 'Fuel Injector 6.7L',          component_id: 1, component_name: 'Fuel Injection System',     components: 'Fuel Injection System', category: 'Fuel System',   cost_price: 185.00, resale_price: 245.00, weight_kg: 0.4, compatibility: 'ISB6.7',   status: 'in_stock',      quantity_available: 12, reorder_threshold: 5,  supplier: 'Cummins Direct', last_ordered: '2025-01-10' },
  { id: 2,  part_number: 'FI-4022-B', name: 'Injection Pump High-Press',    component_id: 1, component_name: 'Fuel Injection System',     components: 'Fuel Injection System', category: 'Fuel System',   cost_price: 640.00, resale_price: 890.00, weight_kg: 2.1, compatibility: 'ISB6.7',   status: 'in_stock',      quantity_available: 4,  reorder_threshold: 2,  supplier: 'Bosch',          last_ordered: '2025-01-05' },
  { id: 3,  part_number: 'FI-4023-C', name: 'Fuel Rail Assembly',           component_id: 1, component_name: 'Fuel Injection System',     components: 'Fuel Injection System', category: 'Fuel System',   cost_price: 230.00, resale_price: 320.00, weight_kg: 1.2, compatibility: 'ISB6.7',   status: 'low_stock',     quantity_available: 2,  reorder_threshold: 3,  supplier: 'Bosch',          last_ordered: '2024-12-20' },
  { id: 4,  part_number: 'EC-0881-A', name: 'Thermostat 82°C',              component_id: 2, component_name: 'Engine Cooling Assembly',   components: 'Engine Cooling Assembly', category: 'Cooling',       cost_price: 55.00,  resale_price: 89.00,  weight_kg: 0.3, compatibility: 'ISX15',    status: 'in_stock',      quantity_available: 8,  reorder_threshold: 4,  supplier: 'Cummins Direct', last_ordered: '2025-01-15' },
  { id: 5,  part_number: 'EC-0882-B', name: 'Coolant Hose Kit',             component_id: 2, component_name: 'Engine Cooling Assembly',   components: 'Engine Cooling Assembly', category: 'Cooling',       cost_price: 40.00,  resale_price: 65.00,  weight_kg: 0.8, compatibility: 'ISX15',    status: 'low_stock',     quantity_available: 1,  reorder_threshold: 5,  supplier: 'OEM Parts Co',   last_ordered: '2024-12-01' },
  { id: 6,  part_number: 'EC-0883-C', name: 'Water Pump Assembly',          component_id: 2, component_name: 'Engine Cooling Assembly',   components: 'Engine Cooling Assembly', category: 'Cooling',       cost_price: 145.00, resale_price: 210.00, weight_kg: 1.5, compatibility: 'ISX15',    status: 'in_stock',      quantity_available: 6,  reorder_threshold: 3,  supplier: 'Cummins Direct', last_ordered: '2025-01-08' },
  { id: 7,  part_number: 'EL-5501-A', name: 'Alternator 24V 120A',          component_id: 3, component_name: 'Electrical Control Module', components: 'Electrical Control Module', category: 'Electrical',    cost_price: 370.00, resale_price: 520.00, weight_kg: 4.2, compatibility: 'All',      status: 'in_stock',      quantity_available: 5,  reorder_threshold: 2,  supplier: 'Delco Remy',     last_ordered: '2025-01-12' },
  { id: 8,  part_number: 'EL-5502-B', name: 'ECM Control Unit',             component_id: 3, component_name: 'Electrical Control Module', components: 'Electrical Control Module', category: 'Electrical',    cost_price: 900.00, resale_price: 1250.00,weight_kg: 1.0, compatibility: 'ISX15',    status: 'in_stock',      quantity_available: 2,  reorder_threshold: 1,  supplier: 'Cummins Direct', last_ordered: '2024-11-30' },
  { id: 9,  part_number: 'LU-1101-A', name: 'Oil Filter Assembly',          component_id: 4, component_name: 'Lubrication System Group', components: 'Lubrication System Group', category: 'Lubrication',   cost_price: 18.00,  resale_price: 28.50,  weight_kg: 0.5, compatibility: 'QSK60',    status: 'low_stock',     quantity_available: 3,  reorder_threshold: 10, supplier: 'OEM Parts Co',   last_ordered: '2025-01-18' },
  { id: 10, part_number: 'LU-1102-B', name: 'Oil Pressure Regulator',       component_id: 4, component_name: 'Lubrication System Group', components: 'Lubrication System Group', category: 'Lubrication',   cost_price: 95.00,  resale_price: 145.00, weight_kg: 0.6, compatibility: 'QSK60',    status: 'in_stock',      quantity_available: 7,  reorder_threshold: 3,  supplier: 'Cummins Direct', last_ordered: '2025-01-02' },
  { id: 11, part_number: 'DB-3301-A', name: 'Serpentine Belt',              component_id: 6, component_name: 'Drive Belt System',        components: 'Drive Belt System', category: 'Drive System',  cost_price: 28.00,  resale_price: 45.00,  weight_kg: 0.4, compatibility: 'All',      status: 'in_stock',      quantity_available: 15, reorder_threshold: 5,  supplier: 'Gates Rubber',   last_ordered: '2025-01-20' },
  { id: 12, part_number: 'DB-3302-B', name: 'Belt Tensioner Pulley',        component_id: 6, component_name: 'Drive Belt System',        components: 'Drive Belt System', category: 'Drive System',  cost_price: 55.00,  resale_price: 85.00,  weight_kg: 0.7, compatibility: 'All',      status: 'out_of_stock',  quantity_available: 0,  reorder_threshold: 3,  supplier: 'Gates Rubber',   last_ordered: '2024-10-15' },
];

let mockParts = [...MOCK_PARTS];

export const partApi = {
  getAll: async (): Promise<Part[]> => {
    try {
      const { data } = await api.get('/parts/');
      return data.results || data;
    } catch {
      return mockParts;
    }
  },
  getById: async (id: number): Promise<Part> => {
    try {
      const { data } = await api.get(`/parts/${id}/`);
      return data;
    } catch {
      const p = mockParts.find(p => p.id === id);
      if (!p) throw new Error('Part not found');
      return p;
    }
  },
  getByComponent: async (componentId: number): Promise<Part[]> => {
    try {
      const { data } = await api.get(`/parts/?component=${componentId}`);
      return data.results || data;
    } 
    catch {
      return mockParts.filter(p => p.components.includes(componentId.toString()));
    }
    // catch {
    //   return mockParts.filter(p => p.components.includes(componentId));    }
  },
  create: async (payload: Partial<Part>): Promise<Part> => {
    try {
      const { data } = await api.post('/parts/', payload);
      return data;
    } catch {
      const newPart: Part = {
        id: Date.now(),
        part_number: payload.part_number ?? '',
        name: payload.name ?? '',
        // component_id: payload.component_id ?? 0,
        components: payload.components ?? '',
        category: payload.category ?? '',
        cost_price: payload.cost_price ?? 0,
        resale_price: payload.resale_price ?? 0,
        weight_kg: payload.weight_kg ?? 0,
        compatibility: payload.compatibility ?? '',
        status: 'in_stock',
        quantity_available: payload.quantity_available ?? 0,
        reorder_threshold: payload.reorder_threshold ?? 0,
        supplier: payload.supplier ?? '',
        last_ordered: payload.last_ordered,
      };
      mockParts = [newPart, ...mockParts];
      return newPart;
    }
  },
  update: async (id: number, payload: Partial<Part>): Promise<Part> => {
    try {
      const { data } = await api.patch(`/parts/${id}/`, payload);
      return data;
    } catch {
      const idx = mockParts.findIndex(p => p.id === id);
      if (idx !== -1) {
        mockParts[idx] = { ...mockParts[idx], ...payload };
        return mockParts[idx];
      }
      throw new Error('Part not found');
    }
  },
};
