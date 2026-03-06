import { api } from './apiClient';

export interface Order {
  id: string;
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
  { id: '1', order_number: 'ORD-019', item_name: 'Fuel Injector 6.7L',  quantity: 2,  status: 'approved',  assigned_ticket: 'TK-002', created_at: '2024-02-14T10:00:00Z', total_price: 490.00,  requested_by: 'Office Staff' },
  { id: '2', order_number: 'ORD-020', item_name: 'Oil Filter Assembly',  quantity: 10, status: 'pending',   assigned_ticket: '',       created_at: '2024-02-15T09:00:00Z', total_price: 285.00,  requested_by: 'Warehouse' },
  { id: '3', order_number: 'ORD-021', item_name: 'Thermostat Kit',       quantity: 3,  status: 'shipped',   assigned_ticket: 'TK-001', created_at: '2024-02-13T14:00:00Z', total_price: 267.00,  requested_by: 'Office Staff' },
  { id: '4', order_number: 'ORD-022', item_name: 'Coolant Hose Kit',     quantity: 5,  status: 'pending',   assigned_ticket: '',       created_at: '2024-02-15T11:00:00Z', total_price: 325.00,  requested_by: 'Warehouse' },
  { id: '5', order_number: 'ORD-023', item_name: 'Belt & Pulley Set',    quantity: 1,  status: 'delivered', assigned_ticket: 'TK-005', created_at: '2024-02-10T08:00:00Z', total_price: 156.00,  requested_by: 'Office Staff' },
];

let mockOrders = [...MOCK_ORDERS];

const ALLOWED_STATUSES = new Set<Order['status']>([
  'pending',
  'approved',
  'shipped',
  'delivered',
  'cancelled',
]);

const toText = (v: unknown): string => {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
};

const toNum = (v: unknown, fallback: number): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
};

const looksLikeUuid = (s: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());

const looksLikePureId = (s: string): boolean =>
  !s ? false : /^\d+$/.test(s.trim()) || looksLikeUuid(s);

const pickReadable = (...values: unknown[]): string => {
  for (const v of values) {
    const s = toText(v);
    if (!s) continue;
    if (looksLikePureId(s)) continue;
    return s;
  }
  return '';
};

const normalizeStatus = (v: unknown): Order['status'] => {
  const s = String(v ?? '').trim().toLowerCase();
  return ALLOWED_STATUSES.has(s as Order['status']) ? (s as Order['status']) : 'pending';
};

const unwrapList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.orders)) return data.orders;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  // Some APIs wrap lists as { data: { results: [...] } }
  if (data.data && typeof data.data === 'object') {
    if (Array.isArray((data.data as any).results)) return (data.data as any).results;
    if (Array.isArray((data.data as any).orders)) return (data.data as any).orders;
    if (Array.isArray((data.data as any).items)) return (data.data as any).items;
  }
  return [];
};

const mapOrder = (raw: any): Order => {
  const id = toText(raw?.id) || String(Date.now());
  const order_number =
    pickReadable(
      raw?.order_number,
      raw?.order_id,
      raw?.order_no,
      raw?.number,
    ) ||
    (id ? `ORD-${id}` : 'ORD');

  const ticketObj = raw?.assigned_ticket ?? raw?.ticket ?? raw?.assignedTicket;
  const ticketId =
    toText(raw?.assigned_ticket) ||
    toText(raw?.assigned_ticket_ticket_id) ||
    toText(raw?.ticket_ticket_id) ||
    toText(raw?.ticket_id) ||
    (ticketObj && typeof ticketObj === 'object' ? toText((ticketObj as any).ticket_id) : '') ||
    (ticketObj && typeof ticketObj === 'object' ? toText((ticketObj as any).ticket_ticket_id) : '') ||
    '';

  // Prefer a human-friendly item/part name over raw ids
  const itemName =
    pickReadable(
      raw?.item_name,
      raw?.item_display,
      raw?.item_label,
      raw?.part_name,
      raw?.part_display,
      raw?.part_label,
      raw?.name,
    ) ||
    // Sometimes the related object is nested
    (raw?.item && typeof raw.item === 'object'
      ? pickReadable(
          (raw.item as any).name,
          (raw.item as any).display_name,
          (raw.item as any).label,
        )
      : '') ||
    (raw?.part && typeof raw.part === 'object'
      ? pickReadable(
          (raw.part as any).name,
          (raw.part as any).display_name,
          (raw.part as any).label,
        )
      : '') ||
    '—';

  // Determine who created / requested the order: AI vs human username
  const createdByObj =
    (raw?.created_by && typeof raw.created_by === 'object' ? raw.created_by : null) ||
    (raw?.profile && typeof raw.profile === 'object' ? raw.profile : null);

  let createdByLabel = '';
  // If backend flags an AI-created order
  if (
    raw?.created_by === 'ai' ||
    raw?.source === 'ai' ||
    raw?.source_type === 'ai' ||
    raw?.created_by_type === 'ai' ||
    raw?.is_ai === true
  ) {
    createdByLabel = 'AI';
  } else if (createdByObj) {
    // Try nested username on profile.user.username
    const userObj =
      (createdByObj as any).user && typeof (createdByObj as any).user === 'object'
        ? (createdByObj as any).user
        : createdByObj;
    createdByLabel =
      pickReadable(
        (userObj as any).username,
        (userObj as any).username_display,
        (userObj as any).email,
        (userObj as any).email_display,
      ) || createdByLabel;
  }

  const requestedByLabel =
    createdByLabel ||
    pickReadable(
      raw?.requested_by_display,
      raw?.requested_by,
      raw?.requestedBy,
      raw?.requester,
      raw?.created_by_display,
      raw?.created_by,
    ) ||
    '—';

  return {
    id,
    order_number,
    item_name: itemName,
    quantity: Math.max(1, Math.round(toNum(raw?.quantity, 1))),
    status: normalizeStatus(raw?.status),
    assigned_ticket: ticketId,
    created_at:
      toText(raw?.created_at) ||
      toText(raw?.createdAt) ||
      toText(raw?.date_created) ||
      new Date().toISOString(),
    total_price: Math.max(
      0,
      toNum(
        raw?.total_price ??
          raw?.totalPrice ??
          raw?.total ??
          raw?.amount ??
          raw?.total_cost ??
          raw?.price_total,
        0,
      ),
    ),
    requested_by: requestedByLabel,
  };
};

export const orderApi = {
  getAll: async (): Promise<Order[]> => {
    try {
      const { data } = await api.get('/orders/');
      const list = unwrapList(data);
      return Array.isArray(list) ? list.map(mapOrder) : [];
    } catch {
      return mockOrders;
    }
  },
  getById: async (id: string): Promise<Order> => {
    try {
      const { data } = await api.get(`/orders/${id}/`);
      return mapOrder(data);
    } catch {
      const o = mockOrders.find(o => o.id === id);
      if (!o) throw new Error('Order not found');
      return o;
    }
  },
  create: async (payload: Partial<Order>): Promise<Order> => {
    try {
      const { data } = await api.post('/orders/', payload);
      return mapOrder(data);
    } catch {
      const newOrder: Order = {
        id: String(Date.now()),
        order_number: `ORD-${String(Date.now()).slice(-3)}`,
        item_name: payload.item_name ?? '',
        quantity: payload.quantity ?? 1,
        status: 'pending',
        assigned_ticket: payload.assigned_ticket ?? '',
        created_at: new Date().toISOString(),
        total_price: typeof payload.total_price === 'number' ? payload.total_price : 0,
        requested_by: payload.requested_by ?? '',
      };
      mockOrders = [newOrder, ...mockOrders];
      return newOrder;
    }
  },
  update: async (id: string, payload: Partial<Order>): Promise<Order> => {
    try {
      const { data } = await api.patch(`/orders/${id}/`, payload);
      return mapOrder(data);
    } catch {
      const idx = mockOrders.findIndex(o => o.id === id);
      if (idx !== -1) {
        mockOrders[idx] = { ...mockOrders[idx], ...payload };
        return mockOrders[idx];
      }
      throw new Error('Order not found');
    }
  },
};
