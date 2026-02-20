import { api } from './apiClient';

export interface Order {
  id: number;
  order_number: string;
  item_name: string;
  quantity: number;
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';
  assigned_ticket: string;
  created_at: string;
  total_price: number;
  requested_by: string;
}

const MOCK_ORDERS: Order[] = [
  { id: 1, order_number: 'ORD-019', item_name: 'Fuel Injector 6.7L', quantity: 2, status: 'approved', assigned_ticket: 'TK-002', created_at: '2024-02-14T10:00:00Z', total_price: 490.00, requested_by: 'Office Staff' },
  { id: 2, order_number: 'ORD-020', item_name: 'Oil Filter Assembly', quantity: 10, status: 'pending', assigned_ticket: '', created_at: '2024-02-15T09:00:00Z', total_price: 285.00, requested_by: 'Warehouse' },
  { id: 3, order_number: 'ORD-021', item_name: 'Thermostat Kit', quantity: 3, status: 'shipped', assigned_ticket: 'TK-001', created_at: '2024-02-13T14:00:00Z', total_price: 267.00, requested_by: 'Office Staff' },
  { id: 4, order_number: 'ORD-022', item_name: 'Coolant Hose Kit', quantity: 5, status: 'pending', assigned_ticket: '', created_at: '2024-02-15T11:00:00Z', total_price: 325.00, requested_by: 'Warehouse' },
  { id: 5, order_number: 'ORD-023', item_name: 'Belt & Pulley Set', quantity: 1, status: 'delivered', assigned_ticket: 'TK-005', created_at: '2024-02-10T08:00:00Z', total_price: 156.00, requested_by: 'Office Staff' },
];

export const orderApi = {
  getAll: async (): Promise<Order[]> => {
    try {
      const { data } = await api.get('/orders/');
      return data.results || data;
    } catch {
      return MOCK_ORDERS;
    }
  },
};
