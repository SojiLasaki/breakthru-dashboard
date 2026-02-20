import { api } from './apiClient';

export interface Technician {
  id: number;
  name: string;
  email: string;
  specialization: 'engine' | 'electrical' | 'general';
  availability: 'available' | 'busy' | 'off_duty';
  location: string;
  address: string;
  lat: number;
  lng: number;
  active_tickets: number;
  phone: string;
  expertise: 'junior' | 'mid' | 'senior';
  photo: string;
}

const MOCK_TECHNICIANS: Technician[] = [
  { id: 1, name: 'John Smith',   email: 'john.smith@cummins.com',   specialization: 'engine',     availability: 'busy',      location: 'Bay Area, CA',    address: '412 Market St, San Francisco, CA 94105',  lat: 37.7749,  lng: -122.4194, active_tickets: 2, phone: '+1-555-0101', expertise: 'senior', photo: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: 2, name: 'Maria Garcia', email: 'maria.garcia@cummins.com', specialization: 'engine',     availability: 'available', location: 'Los Angeles, CA', address: '1200 S Figueroa St, Los Angeles, CA 90015', lat: 34.0522,  lng: -118.2437, active_tickets: 1, phone: '+1-555-0102', expertise: 'mid',    photo: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: 3, name: 'Bob Wilson',   email: 'bob.wilson@cummins.com',   specialization: 'electrical', availability: 'available', location: 'San Diego, CA',   address: '350 10th Ave, San Diego, CA 92101',         lat: 32.7157,  lng: -117.1611, active_tickets: 1, phone: '+1-555-0103', expertise: 'senior', photo: 'https://randomuser.me/api/portraits/men/65.jpg' },
  { id: 4, name: 'Sarah Lee',    email: 'sarah.lee@cummins.com',    specialization: 'electrical', availability: 'off_duty',  location: 'Phoenix, AZ',     address: '200 W Washington St, Phoenix, AZ 85003',    lat: 33.4484,  lng: -112.0740, active_tickets: 0, phone: '+1-555-0104', expertise: 'junior', photo: 'https://randomuser.me/api/portraits/women/21.jpg' },
  { id: 5, name: 'Mike Johnson', email: 'mike.johnson@cummins.com', specialization: 'general',    availability: 'available', location: 'Las Vegas, NV',   address: '3600 S Las Vegas Blvd, Las Vegas, NV 89109', lat: 36.1699,  lng: -115.1398, active_tickets: 0, phone: '+1-555-0105', expertise: 'mid',    photo: 'https://randomuser.me/api/portraits/men/11.jpg' },
  { id: 6, name: 'Aisha Patel',  email: 'aisha.patel@cummins.com',  specialization: 'electrical', availability: 'busy',      location: 'Denver, CO',      address: '1700 Lincoln St, Denver, CO 80203',          lat: 39.7392,  lng: -104.9903, active_tickets: 3, phone: '+1-555-0106', expertise: 'senior', photo: 'https://randomuser.me/api/portraits/women/68.jpg' },
  { id: 7, name: 'Carlos Ruiz',  email: 'carlos.ruiz@cummins.com',  specialization: 'engine',     availability: 'available', location: 'Houston, TX',     address: '901 Bagby St, Houston, TX 77002',            lat: 29.7604,  lng: -95.3698,  active_tickets: 1, phone: '+1-555-0107', expertise: 'junior', photo: 'https://randomuser.me/api/portraits/men/77.jpg' },
  { id: 8, name: 'Linda Chen',   email: 'linda.chen@cummins.com',   specialization: 'general',    availability: 'off_duty',  location: 'Seattle, WA',     address: '400 Broad St, Seattle, WA 98109',            lat: 47.6062,  lng: -122.3321, active_tickets: 0, phone: '+1-555-0108', expertise: 'mid',    photo: 'https://randomuser.me/api/portraits/women/55.jpg' },
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
