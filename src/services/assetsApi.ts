import { api } from './apiClient';

export interface Asset {
  id: number;
  asset_id: string;
  name: string;
  type: 'generator' | 'engine' | 'panel' | 'other';
  model: string;
  serial_number: string;
  status: 'operational' | 'maintenance' | 'offline' | 'decommissioned';
  location: string;
  customer_name: string;
  customer_id: number;
  last_service_date: string;
  next_service_date: string;
  hours_run: number;
  install_date: string;
}

const MOCK_ASSETS: Asset[] = [
  { id: 1, asset_id: 'AST-001', name: 'Generator Unit #4',   type: 'generator', model: 'C175-16',    serial_number: 'SN-7741-A', status: 'maintenance',    location: 'Houston, TX',      customer_name: 'Porter Corp',       customer_id: 1, last_service_date: '2024-01-10', next_service_date: '2024-04-10', hours_run: 8420, install_date: '2021-03-15' },
  { id: 2, asset_id: 'AST-002', name: 'Engine Unit #2',      type: 'engine',    model: 'ISX15-500',  serial_number: 'SN-5523-B', status: 'operational',    location: 'Dallas, TX',       customer_name: 'Western Power Inc', customer_id: 2, last_service_date: '2024-02-01', next_service_date: '2024-05-01', hours_run: 12340, install_date: '2020-07-20' },
  { id: 3, asset_id: 'AST-003', name: 'Generator Unit #1',   type: 'generator', model: 'QSK60',      serial_number: 'SN-3312-C', status: 'operational',    location: 'Phoenix, AZ',      customer_name: 'Delta Energy Group',customer_id: 3, last_service_date: '2023-12-15', next_service_date: '2024-03-15', hours_run: 6890, install_date: '2019-11-01' },
  { id: 4, asset_id: 'AST-004', name: 'Engine Unit #3',      type: 'engine',    model: 'ISB6.7',     serial_number: 'SN-9901-D', status: 'operational',    location: 'San Antonio, TX',  customer_name: 'Harrison Farms',    customer_id: 5, last_service_date: '2024-01-20', next_service_date: '2024-04-20', hours_run: 4120, install_date: '2022-05-10' },
  { id: 5, asset_id: 'AST-005', name: 'Generator Unit #5',   type: 'generator', model: 'C175-16',    serial_number: 'SN-2287-E', status: 'offline',        location: 'Tucson, AZ',       customer_name: 'Sun Valley Mining', customer_id: 6, last_service_date: '2023-11-05', next_service_date: '2024-02-05', hours_run: 15600, install_date: '2018-09-25' },
  { id: 6, asset_id: 'AST-006', name: 'Control Panel #1',    type: 'panel',     model: 'MCC-400',    serial_number: 'SN-6641-F', status: 'operational',    location: 'Los Angeles, CA',  customer_name: 'Pacific Roofing Co',customer_id: 4, last_service_date: '2024-02-10', next_service_date: '2024-08-10', hours_run: 0,    install_date: '2023-01-12' },
];

let mockAssets = [...MOCK_ASSETS];

export const assetsApi = {
  getAll: async (): Promise<Asset[]> => {
    try {
      const { data } = await api.get('/assets/');
      return data.results || data;
    } catch {
      return mockAssets;
    }
  },
  getById: async (id: number): Promise<Asset> => {
    try {
      const { data } = await api.get(`/assets/${id}/`);
      return data;
    } catch {
      const a = mockAssets.find(a => a.id === id);
      if (!a) throw new Error('Asset not found');
      return a;
    }
  },
  update: async (id: number, payload: Partial<Asset>): Promise<Asset> => {
    try {
      const { data } = await api.patch(`/assets/${id}/`, payload);
      return data;
    } catch {
      const idx = mockAssets.findIndex(a => a.id === id);
      if (idx !== -1) {
        mockAssets[idx] = { ...mockAssets[idx], ...payload };
        return mockAssets[idx];
      }
      throw new Error('Asset not found');
    }
  },
};
