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

export interface TechTask {
  id: number;
  ticket_id: string;
  title: string;
  description: string;
  completed_at: string;
  duration_hours: number;
  status: 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const MOCK_TECHNICIANS: Technician[] = [
  { id: 1, name: 'John Smith',   email: 'john.smith@cummins.com',   specialization: 'engine',     availability: 'busy',      location: 'Bay Area, CA',    address: '412 Market St, San Francisco, CA 94105',   lat: 37.7749, lng: -122.4194, active_tickets: 2, phone: '+1-555-0101', expertise: 'senior', photo: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: 2, name: 'Maria Garcia', email: 'maria.garcia@cummins.com', specialization: 'engine',     availability: 'available', location: 'Los Angeles, CA', address: '1200 S Figueroa St, Los Angeles, CA 90015', lat: 34.0522, lng: -118.2437, active_tickets: 1, phone: '+1-555-0102', expertise: 'mid',    photo: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: 3, name: 'Bob Wilson',   email: 'bob.wilson@cummins.com',   specialization: 'electrical', availability: 'available', location: 'San Diego, CA',   address: '350 10th Ave, San Diego, CA 92101',         lat: 32.7157, lng: -117.1611, active_tickets: 1, phone: '+1-555-0103', expertise: 'senior', photo: 'https://randomuser.me/api/portraits/men/65.jpg' },
  { id: 4, name: 'Sarah Lee',    email: 'sarah.lee@cummins.com',    specialization: 'electrical', availability: 'off_duty',  location: 'Phoenix, AZ',     address: '200 W Washington St, Phoenix, AZ 85003',   lat: 33.4484, lng: -112.0740, active_tickets: 0, phone: '+1-555-0104', expertise: 'junior', photo: 'https://randomuser.me/api/portraits/women/21.jpg' },
  { id: 5, name: 'Mike Johnson', email: 'mike.johnson@cummins.com', specialization: 'general',    availability: 'available', location: 'Las Vegas, NV',   address: '3600 S Las Vegas Blvd, Las Vegas, NV 89109',lat: 36.1699, lng: -115.1398, active_tickets: 0, phone: '+1-555-0105', expertise: 'mid',    photo: 'https://randomuser.me/api/portraits/men/11.jpg' },
  { id: 6, name: 'Aisha Patel',  email: 'aisha.patel@cummins.com',  specialization: 'electrical', availability: 'busy',      location: 'Denver, CO',      address: '1700 Lincoln St, Denver, CO 80203',         lat: 39.7392, lng: -104.9903, active_tickets: 3, phone: '+1-555-0106', expertise: 'senior', photo: 'https://randomuser.me/api/portraits/women/68.jpg' },
  { id: 7, name: 'Carlos Ruiz',  email: 'carlos.ruiz@cummins.com',  specialization: 'engine',     availability: 'available', location: 'Houston, TX',     address: '901 Bagby St, Houston, TX 77002',           lat: 29.7604, lng: -95.3698,  active_tickets: 1, phone: '+1-555-0107', expertise: 'junior', photo: 'https://randomuser.me/api/portraits/men/77.jpg' },
  { id: 8, name: 'Linda Chen',   email: 'linda.chen@cummins.com',   specialization: 'general',    availability: 'off_duty',  location: 'Seattle, WA',     address: '400 Broad St, Seattle, WA 98109',           lat: 47.6062, lng: -122.3321, active_tickets: 0, phone: '+1-555-0108', expertise: 'mid',    photo: 'https://randomuser.me/api/portraits/women/55.jpg' },
];

const MOCK_TASK_HISTORY: Record<number, TechTask[]> = {
  1: [
    { id: 101, ticket_id: 'TKT-001', title: 'ISX15 Oil Leak Repair',          description: 'Identified and repaired crankshaft seal leak on ISX15 engine.',     completed_at: '2026-02-10', duration_hours: 4.5, status: 'completed', priority: 'high' },
    { id: 102, ticket_id: 'TKT-005', title: 'Engine Overhaul – QSK60',         description: 'Full top-end overhaul including valve grinding and head gasket.',    completed_at: '2026-01-28', duration_hours: 12,  status: 'completed', priority: 'urgent' },
    { id: 103, ticket_id: 'TKT-009', title: 'Fuel Injector Replacement',       description: 'Replaced 6 fuel injectors and recalibrated fuel delivery system.',   completed_at: '2026-01-15', duration_hours: 3.5, status: 'completed', priority: 'medium' },
    { id: 104, ticket_id: 'TKT-013', title: 'Turbocharger Inspection',         description: 'Inspected and cleaned turbocharger; no replacement required.',       completed_at: '2025-12-20', duration_hours: 2,   status: 'completed', priority: 'low' },
  ],
  2: [
    { id: 201, ticket_id: 'TKT-002', title: 'Cooling System Flush',            description: 'Full coolant flush and thermostat replacement on ISB6.7.',          completed_at: '2026-02-12', duration_hours: 2,   status: 'completed', priority: 'medium' },
    { id: 202, ticket_id: 'TKT-007', title: 'Belt & Tensioner Service',        description: 'Replaced serpentine belt and tensioner assembly.',                  completed_at: '2026-01-30', duration_hours: 1.5, status: 'completed', priority: 'low' },
    { id: 203, ticket_id: 'TKT-011', title: 'Engine Mount Replacement',        description: 'Replaced worn engine mounts causing excessive vibration.',          completed_at: '2026-01-18', duration_hours: 3,   status: 'completed', priority: 'medium' },
  ],
  3: [
    { id: 301, ticket_id: 'TKT-003', title: 'Generator Wiring Fault',          description: 'Traced and repaired short circuit in generator wiring harness.',    completed_at: '2026-02-08', duration_hours: 5,   status: 'completed', priority: 'urgent' },
    { id: 302, ticket_id: 'TKT-008', title: 'Control Panel Calibration',       description: 'Recalibrated generator control panel sensors and alarms.',          completed_at: '2026-01-25', duration_hours: 2.5, status: 'completed', priority: 'medium' },
    { id: 303, ticket_id: 'TKT-015', title: 'ECM Software Update',             description: 'Applied latest firmware update to engine control module.',          completed_at: '2025-12-15', duration_hours: 1,   status: 'completed', priority: 'low' },
  ],
  4: [{ id: 401, ticket_id: 'TKT-004', title: 'Alternator Replacement', description: 'Diagnosed faulty alternator; replaced unit and tested output.', completed_at: '2026-01-20', duration_hours: 2.5, status: 'completed', priority: 'high' }],
  5: [
    { id: 501, ticket_id: 'TKT-006', title: 'Preventive Maintenance – C175',   description: '500-hour scheduled PM including filter changes and fluid top-up.', completed_at: '2026-02-05', duration_hours: 3,   status: 'completed', priority: 'low' },
    { id: 502, ticket_id: 'TKT-010', title: 'Exhaust System Inspection',       description: 'Inspected DPF and DEF system; cleaned filter.',                    completed_at: '2026-01-22', duration_hours: 2,   status: 'completed', priority: 'medium' },
  ],
  6: [
    { id: 601, ticket_id: 'TKT-014', title: 'VFD Drive Fault Diagnosis',       description: 'Diagnosed variable frequency drive fault and replaced control board.', completed_at: '2026-02-01', duration_hours: 6, status: 'completed', priority: 'urgent' },
    { id: 602, ticket_id: 'TKT-018', title: 'Switchgear Panel Maintenance',    description: 'Annual switchgear maintenance and contact cleaning.',              completed_at: '2026-01-10', duration_hours: 4,   status: 'completed', priority: 'medium' },
  ],
  7: [{ id: 701, ticket_id: 'TKT-016', title: 'Piston Ring Replacement', description: 'Replaced worn piston rings on cylinders 3 & 4.', completed_at: '2026-02-03', duration_hours: 8, status: 'completed', priority: 'high' }],
  8: [
    { id: 801, ticket_id: 'TKT-012', title: 'Oil Analysis – Fleet Wide',       description: 'Collected and sent oil samples from 12 units for lab analysis.',   completed_at: '2026-01-29', duration_hours: 2,   status: 'completed', priority: 'low' },
    { id: 802, ticket_id: 'TKT-017', title: 'Air Filter Service',              description: 'Replaced air filters and cleaned intake systems on 4 units.',      completed_at: '2026-01-14', duration_hours: 2.5, status: 'completed', priority: 'low' },
  ],
};

let mockTechnicians = [...MOCK_TECHNICIANS];

export const technicianApi = {
  getAll: async (): Promise<Technician[]> => {
    try {
      const { data } = await api.get('/technicians/');
      return data.results || data;
    } catch {
      return mockTechnicians;
    }
  },

  getById: async (id: number): Promise<Technician> => {
    try {
      const { data } = await api.get(`/technicians/${id}/`);
      return data;
    } catch {
      const t = mockTechnicians.find(t => t.id === id);
      if (!t) throw new Error('Technician not found');
      return t;
    }
  },

  create: async (payload: Partial<Technician>): Promise<Technician> => {
    try {
      const { data } = await api.post('/technicians/', payload);
      return data;
    } catch {
      const newTech: Technician = {
        id: Date.now(),
        name: payload.name ?? '',
        email: payload.email ?? '',
        phone: payload.phone ?? '',
        location: payload.location ?? '',
        address: payload.address ?? '',
        specialization: payload.specialization ?? 'general',
        expertise: payload.expertise ?? 'junior',
        availability: 'available',
        lat: 0,
        lng: 0,
        active_tickets: 0,
        photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(payload.name ?? 'New')}&background=1a1f2e&color=e61409&size=96`,
      };
      mockTechnicians = [newTech, ...mockTechnicians];
      return newTech;
    }
  },

  update: async (id: number, payload: Partial<Technician>): Promise<Technician> => {
    try {
      const { data } = await api.patch(`/technicians/${id}/`, payload);
      return data;
    } catch {
      const idx = mockTechnicians.findIndex(t => t.id === id);
      if (idx !== -1) {
        mockTechnicians[idx] = { ...mockTechnicians[idx], ...payload };
        return mockTechnicians[idx];
      }
      throw new Error('Technician not found');
    }
  },

  getTaskHistory: async (technicianId: number): Promise<TechTask[]> => {
    try {
      const { data } = await api.get(`/technicians/${technicianId}/tasks/`);
      return data.results || data;
    } catch {
      return MOCK_TASK_HISTORY[technicianId] || [];
    }
  },
};
