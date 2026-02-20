import { api } from './apiClient';

export interface Technician {
  id: number;
  name: string;
  email: string;
  specialization: 'engine' | 'electrical' | 'general';
  availability: 'available' | 'busy' | 'off_duty';
  location: string;
  active_tickets: number;
  phone: string;
}

const MOCK_TECHNICIANS: Technician[] = [
  { id: 1, name: 'John Smith', email: 'john.smith@cummins.com', specialization: 'engine', availability: 'busy', location: 'Bay Area, CA', active_tickets: 2, phone: '+1-555-0101' },
  { id: 2, name: 'Maria Garcia', email: 'maria.garcia@cummins.com', specialization: 'engine', availability: 'available', location: 'Los Angeles, CA', active_tickets: 1, phone: '+1-555-0102' },
  { id: 3, name: 'Bob Wilson', email: 'bob.wilson@cummins.com', specialization: 'electrical', availability: 'available', location: 'San Diego, CA', active_tickets: 1, phone: '+1-555-0103' },
  { id: 4, name: 'Sarah Lee', email: 'sarah.lee@cummins.com', specialization: 'electrical', availability: 'off_duty', location: 'Phoenix, AZ', active_tickets: 0, phone: '+1-555-0104' },
  { id: 5, name: 'Mike Johnson', email: 'mike.johnson@cummins.com', specialization: 'general', availability: 'available', location: 'Las Vegas, NV', active_tickets: 0, phone: '+1-555-0105' },
];

export const technicianApi = {
  getAll: async (): Promise<Technician[]> => {
    try {
      const { data } = await api.get('/technicians/');
      return data.results || data;
    } catch {
      return MOCK_TECHNICIANS;
    }
  },
};
