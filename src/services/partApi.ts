import { api } from './apiClient';

export interface Part {
  id: string;
  part_number: string;
  name: string;
  components_id: string[];
  components_name: string[];
  // componentss: string;
  category: string;
  cost_price: number;
  resale_price: number;
  weight_kg: number;
  // compatibility: string;
  status: string;
  quantity_available: number;
  description: string;
  reorder_threshold: number;
  inventory_deducted: boolean;
  created_at: string;
  supplier: string;
  last_ordered?: string; 
}

const MOCK_PARTS: Part[] = [
  {
    id: "dd085319-2df2-431c-a33c-8e1453447095",
    part_number: "PRT1001",
    name: "VGT Turbocharger",
    description: "Highly reliable and precise design for rapid acceleration",
    quantity_available: 5,
    reorder_threshold: 1,
    category: "other",
    weight_kg: null,
    cost_price: null,
    resale_price: null,
    status: "in_stock",
    supplier: "Top Tower Technologies",
    inventory_deducted: false,
    created_at: "2026-02-19T23:31:33.758967Z",
    components_id: ["11111111-aaaa-bbbb-cccc-000000000001"],
    components_name: ["X15 Efficiency Series (2024)"],
    last_ordered: "2026-02-24T14:30:00Z",
  },
  {
    id: "aa105319-2df2-431c-a33c-8e1453447001",
    part_number: "PRT1002",
    name: "Fuel Injector 6.7L",
    description: "Precision injector for ISB 6.7 engine platform",
    quantity_available: 12,
    reorder_threshold: 5,
    category: "fuel_system",
    weight_kg: 0.4,
    cost_price: 185.0,
    resale_price: 245.0,
    status: "in_stock",
    supplier: "Cummins Direct",
    inventory_deducted: false,
    created_at: "2026-02-20T10:12:11.000000Z",
    components_id: ["22222222-aaaa-bbbb-cccc-000000000002"],
    components_name: ["Fuel Injection System"],
    last_ordered: "2026-02-24T14:30:00Z",
  },
  {
    id: "bb205319-2df2-431c-a33c-8e1453447002",
    part_number: "PRT1003",
    name: "Water Pump Assembly",
    description: "Heavy-duty cooling system water pump",
    quantity_available: 2,
    reorder_threshold: 3,
    category: "cooling",
    weight_kg: 1.5,
    cost_price: 145.0,
    resale_price: 210.0,
    status: "low_stock",
    supplier: "Cummins Direct",
    inventory_deducted: false,
    created_at: "2026-02-18T08:20:45.000000Z",
    components_id: ["33333333-aaaa-bbbb-cccc-000000000003"],
    components_name: ["Engine Cooling Assembly"],
    last_ordered: "2026-02-24T14:30:00Z",
  },
  {
    id: "cc305319-2df2-431c-a33c-8e1453447003",
    part_number: "PRT1004",
    name: "Alternator 24V 120A",
    description: "High-output alternator for heavy-duty engines",
    quantity_available: 0,
    reorder_threshold: 2,
    category: "electrical",
    weight_kg: 4.2,
    cost_price: 370.0,
    resale_price: 520.0,
    status: "out_of_stock",
    supplier: "Delco Remy",
    inventory_deducted: false,
    created_at: "2026-02-15T14:55:00.000000Z",
    components_id: ["44444444-aaaa-bbbb-cccc-000000000004"],
    components_name: ["Electrical Control Module"],
    last_ordered: "2026-02-24T14:30:00Z",
  },
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
  getById: async (id: string): Promise<Part> => {
    try {
      const { data } = await api.get(`/parts/${id}/`);
      return data;
    } catch {
      const p = mockParts.find(p => p.id === id);
      if (!p) throw new Error('Part not found');
      return p;
    }
  },
  getBycomponents: async (componentsId: string): Promise<Part[]> => {
    try {
      const { data } = await api.get(`/parts/?components=${componentsId}`);
      return data.results || data;
    } 
    catch {
      return mockParts.filter(p => p.components_id.includes(componentsId.toString()));
    }
    // catch {
    //   return mockParts.filter(p => p.componentss.includes(componentsId));    }
  },
  create: async (payload: Partial<Part>): Promise<Part> => {
    try {
      const { data } = await api.post('/parts/', payload);
      return data;
    } catch {
      const newPart: Part = {
        id: Date.now().toString(),
        part_number: payload.part_number ?? '',
        name: payload.name ?? '',
        description: payload.description ?? '',
        components_id: payload.components_id ?? [],
        components_name: payload.components_name ?? [],
        // componentss: payload.componentss ?? '',
        category: payload.category ?? '',
        cost_price: payload.cost_price ?? 0,
        resale_price: payload.resale_price ?? 0,
        weight_kg: payload.weight_kg ?? 0,
        // compatibility: payload.compatibility ?? '',
        status: 'in_stock',
        inventory_deducted: false,
        quantity_available: payload.quantity_available ?? 0,
        reorder_threshold: payload.reorder_threshold ?? 0,
        supplier: payload.supplier ?? '',
        created_at: new Date().toISOString(),
        last_ordered: payload.last_ordered,
      };
      mockParts = [newPart, ...mockParts];
      return newPart;
    }
  },
  update: async (id: string, payload: Partial<Part>): Promise<Part> => {
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
