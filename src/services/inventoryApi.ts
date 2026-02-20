import { api } from './apiClient';

export interface InventoryItem {
  id: number;
  part_number: string;
  name: string;
  category: string;
  quantity: number;
  reorder_level: number;
  unit_price: number;
  supplier: string;
  last_updated: string;
}

const MOCK_INVENTORY: InventoryItem[] = [
  { id: 1, part_number: 'FI-4021', name: 'Fuel Injector 6.7L',  category: 'Fuel System',  quantity: 12, reorder_level: 5,  unit_price: 245.00, supplier: 'Cummins Direct', last_updated: '2024-02-15' },
  { id: 2, part_number: 'FL-1102', name: 'Oil Filter Assembly',  category: 'Lubrication',  quantity: 3,  reorder_level: 10, unit_price: 28.50,  supplier: 'OEM Parts Co',   last_updated: '2024-02-14' },
  { id: 3, part_number: 'TH-0887', name: 'Thermostat Kit',       category: 'Cooling',      quantity: 8,  reorder_level: 4,  unit_price: 89.00,  supplier: 'Cummins Direct', last_updated: '2024-02-13' },
  { id: 4, part_number: 'BP-2234', name: 'Belt & Pulley Set',    category: 'Drive System', quantity: 2,  reorder_level: 3,  unit_price: 156.00, supplier: 'Gates Rubber',   last_updated: '2024-02-12' },
  { id: 5, part_number: 'EL-5501', name: 'Alternator 24V',       category: 'Electrical',   quantity: 5,  reorder_level: 2,  unit_price: 520.00, supplier: 'Delco Remy',     last_updated: '2024-02-11' },
  { id: 6, part_number: 'CL-3390', name: 'Coolant Hose Kit',     category: 'Cooling',      quantity: 1,  reorder_level: 5,  unit_price: 65.00,  supplier: 'OEM Parts Co',   last_updated: '2024-02-10' },
  { id: 7, part_number: 'IP-7750', name: 'Injection Pump',       category: 'Fuel System',  quantity: 4,  reorder_level: 2,  unit_price: 890.00, supplier: 'Bosch',          last_updated: '2024-02-09' },
];

let mockInventory = [...MOCK_INVENTORY];

export const inventoryApi = {
  getAll: async (): Promise<InventoryItem[]> => {
    try {
      const { data } = await api.get('/inventory/');
      return data.results || data;
    } catch {
      return mockInventory;
    }
  },
  getById: async (id: number): Promise<InventoryItem> => {
    try {
      const { data } = await api.get(`/inventory/${id}/`);
      return data;
    } catch {
      const item = mockInventory.find(i => i.id === id);
      if (!item) throw new Error('Item not found');
      return item;
    }
  },
  update: async (id: number, payload: Partial<InventoryItem>): Promise<InventoryItem> => {
    try {
      const { data } = await api.patch(`/inventory/${id}/`, payload);
      return data;
    } catch {
      const idx = mockInventory.findIndex(i => i.id === id);
      if (idx !== -1) {
        mockInventory[idx] = { ...mockInventory[idx], ...payload, last_updated: new Date().toISOString().split('T')[0] };
        return mockInventory[idx];
      }
      throw new Error('Item not found');
    }
  },
  createOrder: async (itemId: number, quantity: number): Promise<void> => {
    try {
      await api.post('/orders/', { inventory_item: itemId, quantity, status: 'pending' });
    } catch {
      console.log('Order created (mock):', { itemId, quantity });
    }
  },
};
