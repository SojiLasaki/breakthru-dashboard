// import { api } from './apiClient';

// export interface Customer {
//   id: number;
//   first_name?: string;
//   last_name?: string;
//   name: string;
//   email: string;
//   phone: string;
//   company: string;
//   location: string;
//   status: 'active' | 'inactive';
//   total_tickets: number;
//   open_tickets: number;
//   created_at: string;
//   contact_person: string;
// }

// const MOCK_CUSTOMERS: Customer[] = [
//   { id: 1, name: 'James Porter',    email: 'james.porter@portercorp.com',  phone: '+1-555-1001', company: 'Porter Corp',        location: 'Houston, TX',      status: 'active',   total_tickets: 3, open_tickets: 2, created_at: '2023-06-10', contact_person: 'James Porter' },
//   { id: 2, name: 'Sarah Mitchell',  email: 'sarah.m@westernpower.com',     phone: '+1-555-1002', company: 'Western Power Inc',   location: 'Dallas, TX',       status: 'active',   total_tickets: 5, open_tickets: 1, created_at: '2023-04-22', contact_person: 'Sarah Mitchell' },
//   { id: 3, name: 'Ravi Patel',      email: 'ravi@deltaenergy.com',         phone: '+1-555-1003', company: 'Delta Energy Group',  location: 'Phoenix, AZ',      status: 'active',   total_tickets: 2, open_tickets: 0, created_at: '2023-09-15', contact_person: 'Ravi Patel' },
//   { id: 4, name: 'Linda Zhao',      email: 'linda.z@pacificroofing.com',   phone: '+1-555-1004', company: 'Pacific Roofing Co',  location: 'Los Angeles, CA',  status: 'inactive', total_tickets: 1, open_tickets: 0, created_at: '2022-11-30', contact_person: 'Linda Zhao' },
//   { id: 5, name: 'Tom Harrison',    email: 'tom.h@harrisonfarm.com',       phone: '+1-555-1005', company: 'Harrison Farms',      location: 'San Antonio, TX',  status: 'active',   total_tickets: 4, open_tickets: 2, created_at: '2024-01-05', contact_person: 'Tom Harrison' },
//   { id: 6, name: 'Maria Santos',    email: 'msantos@sunvalleymining.com',  phone: '+1-555-1006', company: 'Sun Valley Mining',   location: 'Tucson, AZ',       status: 'active',   total_tickets: 7, open_tickets: 3, created_at: '2023-02-18', contact_person: 'Maria Santos' },
// ];

// let mockCustomers = [...MOCK_CUSTOMERS];

// export const customerApi = {
//   getAll: async (): Promise<Customer[]> => {
//     try {
//       const { data } = await api.get('/customers/');
//       return data.results || data;
//     } catch {
//       return mockCustomers;
//     }
//   },
//   getById: async (id: number): Promise<Customer> => {
//     try {
//       const { data } = await api.get(`/customers/${id}/`);
//       return data;
//     } catch {
//       const c = mockCustomers.find(c => c.id === id);
//       if (!c) throw new Error('Customer not found');
//       return c;
//     }
//   },
//   create: async (payload: Partial<Customer>): Promise<Customer> => {
//     try {
//       const { data } = await api.post('/customers/', payload);
//       return data;
//     } catch {
//       const fullName = payload.name ?? `${payload.first_name ?? ''} ${payload.last_name ?? ''}`.trim();
//       const newCustomer: Customer = {
//         id: Date.now(),
//         first_name: payload.first_name ?? payload.name?.split(' ')[0] ?? '',
//         last_name: payload.last_name ?? payload.name?.split(' ').slice(1).join(' ') ?? '',
//         name: fullName,
//         email: payload.email ?? '',
//         phone: payload.phone ?? '',
//         company: payload.company ?? '',
//         location: payload.location ?? '',
//         status: 'active',
//         total_tickets: 0,
//         open_tickets: 0,
//         created_at: new Date().toISOString(),
//         contact_person: fullName,
//       };
//       mockCustomers = [newCustomer, ...mockCustomers];
//       return newCustomer;
//     }
//   },
//   update: async (id: number, payload: Partial<Customer>): Promise<Customer> => {
//     try {
//       const { data } = await api.patch(`/customers/${id}/`, payload);
//       return data;
//     } catch {
//       const idx = mockCustomers.findIndex(c => c.id === id);
//       if (idx !== -1) {
//         mockCustomers[idx] = { ...mockCustomers[idx], ...payload };
//         return mockCustomers[idx];
//       }
//       throw new Error('Customer not found');
//     }
//   },
// };


import { api } from './apiClient';

export interface Customer {
  id: number;
  first_name?: string;
  last_name?: string;
  email: string;
  phone: string;
  company: string;
  street_address: string;
  street_address_2: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  status: 'active' | 'inactive';
  total_tickets: number;
  open_tickets: number;
  created_at: string;
  contact_person: string;
  _pending?: boolean; // marks unsynced records
}

const CACHE_KEY = 'customers_cache';

function saveToCache(data: Customer[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function loadFromCache(): Customer[] {
  const cached = localStorage.getItem(CACHE_KEY);
  return cached ? JSON.parse(cached) : [];
}

export const customerApi = {
  // getAll: async (): Promise<Customer[]> => {
  //   try {
  //     const { data } = await api.get('/customers/');
  //     const customers = (data.results ?? data).map((c: any) => ({
  //       ...c,
  //       name: c.name ?? `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
  //     }));
  //     saveToCache(customers);
  //     return customers;
  //   } catch (error) {
  //     console.warn('Backend unavailable — loading cached customers');
  //     return loadFromCache();
  //   }
  // },


  getAll: async (): Promise<Customer[]> => {
    try {
      const { data } = await api.get('/customers/');
      const customers: Customer[] = (data.results ?? data).map(c => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        // name: c.name || c.customer_info || 'Unknown',
        email: c.email ?? '',
        phone: c.phone_number ?? '',
        company: c.company_name ?? '',
        street_address: c.street_address ?? '',
        street_address_2: c.street_address_2 ?? '',
        city: c.city ?? '',
        state: c.state ?? '',
        zip_code: c.postal_code ?? '',
        country: c.country ?? '',
        status: c.is_active ? 'active' : 'inactive',
        total_tickets: c.total_tickets ?? 0,
        open_tickets: c.open_tickets ?? 0,
        created_at: c.created_at,
        contact_person: c.name || 'Unknown',
      }));
  
      saveToCache(customers);
      console.log('Mapped customers:', customers);
      return customers;
    } catch (error) {
      console.warn('Backend unavailable — loading cached customers');
      const cached = loadFromCache();
      console.log('Cached customers:', cached);
      return cached;
    }
  },

  getById: async (id: number): Promise<Customer> => {
    try {
      const { data } = await api.get(`/customers/${id}/`);
      return data;
    } catch (error) {
      const cached = loadFromCache();
      const customer = cached.find(c => c.id === id);
      if (!customer) throw new Error('Customer not found');
      return customer;
    }
  },

  create: async (payload: Partial<Customer>): Promise<Customer> => {
    try {
      const { data } = await api.post('/customers/', payload);

      const cached = loadFromCache();
      saveToCache([data, ...cached]);

      return data;
    } catch (error) {
      throw new Error('Failed to create customer');
    }
  },

  update: async (id: number, payload: Partial<Customer>): Promise<Customer> => {
    try {
      const { data } = await api.patch(`/customers/${id}/`, payload);

      const cached = loadFromCache().map(c =>
        c.id === id ? { ...c, ...data } : c
      );
      saveToCache(cached);

      return data;
    } catch (error) {
      throw new Error('Failed to update customer');
    }
  },

  delete: async (id: number): Promise<void> => {
    try {
      await api.delete(`/customers/${id}/`);

      const cached = loadFromCache().filter(c => c.id !== id);
      saveToCache(cached);
    } catch (error) {
      throw new Error('Failed to delete customer');
    }
  },
};