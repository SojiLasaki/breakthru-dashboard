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

const mapCustomer = (c: any): Customer => ({
  id: String(c.id),
  first_name: c.first_name_display ?? c.first_name ?? '',
  last_name: c.last_name_display ?? c.last_name ?? '',
  email: c.email_display ?? c.email ?? '',
  phone: c.phone_number ?? c.phone ?? '',
  company: c.company_name ?? c.company ?? '',
  street_address: c.street_address ?? '',
  street_address_2: c.street_address_2 ?? '',
  city: c.city ?? '',
  state: c.state ?? '',
  country: c.country ?? '',
  postal_code: c.postal_code ?? c.zip_code ?? '',
  zip_code: c.zip_code ?? c.postal_code ?? '',
  status: c.is_active ? 'active' : 'inactive',
  total_tickets: typeof c.total_tickets === 'number' ? c.total_tickets : 0,
  open_tickets: typeof c.open_tickets === 'number' ? c.open_tickets : 0,
  customer_info: c.customer_info ?? '',
  // Use a consistent avatar URL if backend doesn't provide one
  // (we don't store photo in the Customer interface but can extend if needed)
  created_at: c.created_at ?? '',
  contact_person: c.name || `${c.first_name_display ?? c.first_name ?? ''} ${c.last_name_display ?? c.last_name ?? ''}`.trim() || 'Unknown',
});

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
      const list = data.results ?? data;
      const customers: Customer[] = Array.isArray(list) ? list.map(mapCustomer) : [];

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
      return mapCustomer(data);
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
      const mapped = mapCustomer(data);
      const cached = loadFromCache();
      saveToCache([mapped, ...cached]);
      return mapped;
    } catch (error) {
      throw new Error('Failed to create customer');
    }
  },

  update: async (id: string, payload: Partial<Customer>): Promise<Customer> => {
    try {
      const { data } = await api.patch(`/customers/${id}/`, payload);
      const mapped = mapCustomer(data);
      const cached = loadFromCache().map(c =>
        c.id === id ? mapped : c
      );
      saveToCache(cached);

      return mapped;
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