import { api } from './apiClient';

export interface Customer {
  id: string;
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
  postal_code?: string;
  country: string;
  customer_info?: string;
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
        first_name: c.first_name_display,
        last_name: c.last_name_display,
        // name: c.name || c.customer_info || 'Unknown',
        email: c.email_display ?? '',
        phone: c.phone_number ?? '',
        company: c.company_name ?? '',
        street_address: c.street_address ?? '',
        street_address_2: c.street_address_2 ?? '',
        city: c.city ?? '',
        state: c.state ?? '',
        country: c.country ?? '',
        postal_code: c.postal_code ?? '',
        status: c.is_active ? 'active' : 'inactive',
        total_tickets: c.total_tickets ?? 0,
        open_tickets: c.open_tickets ?? 0,
        customer_info: c.customer_info ?? '',
        photo: c.photo ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(c.first_name_display ?? 'Unknown')}&background=1a1f2e&color=e61409&size=64`,
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

  getById: async (id: string): Promise<Customer> => {
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

  update: async (id: string, payload: Partial<Customer>): Promise<Customer> => {
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

  delete: async (id: string): Promise<void> => {
    try {
      await api.delete(`/customers/${id}/`);

      const cached = loadFromCache().filter(c => c.id !== id);
      saveToCache(cached);
    } catch (error) {
      throw new Error('Failed to delete customer');
    }
  },
};