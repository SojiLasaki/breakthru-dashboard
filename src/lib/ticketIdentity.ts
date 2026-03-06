import type { User } from '@/context/AuthContext';
import type { Ticket } from '@/services/ticketApi';

const norm = (value: unknown): string => {
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const fullNameFrom = (first: unknown, last: unknown): string => {
  const f = typeof first === 'string' ? first.trim() : '';
  const l = typeof last === 'string' ? last.trim() : '';
  return `${f} ${l}`.trim();
};

const uniqueNonEmpty = (values: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const n = norm(v);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
};

const userIdentityKeys = (user: User | null | undefined): string[] => {
  if (!user) return [];
  const first = (user as any).first_name_display || user.first_name;
  const last = (user as any).last_name_display || user.last_name;
  return uniqueNonEmpty([
    fullNameFrom(first, last),
    user.username,
    user.email,
    typeof first === 'string' ? first : '',
    typeof last === 'string' ? last : '',
  ]);
};

const ticketAssignedKeys = (ticket: Ticket): string[] =>
  uniqueNonEmpty([
    ticket.assigned_to,
    ticket.assigned_technician,
    ticket.assigned_technician_username,
    ticket.assigned_technician_profile_id,
    ticket.assigned_technician_id,
    fullNameFrom(ticket.assigned_technician_first_name, ticket.assigned_technician_last_name),
  ]);

const toId = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string' && v.trim()) return String(v).trim().toLowerCase();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
};

const userIdentityIds = (user: User | null | undefined): string[] =>
  uniqueNonEmpty([toId(user?.id), toId(user?.technician_profile_id), toId((user as any)?.profile_id)]);

const looksLikeUuid = (s: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());

const ticketCreatedByKeys = (ticket: Ticket): string[] =>
  uniqueNonEmpty([
    ticket.created_by,
    ...(ticket.customer && !looksLikeUuid(ticket.customer) ? [ticket.customer] : []),
  ]);

const intersects = (a: string[], b: string[]): boolean => {
  if (!a.length || !b.length) return false;
  const set = new Set(a);
  for (const v of b) {
    if (set.has(v)) return true;
  }
  return false;
};

export const isTicketAssignedToUser = (ticket: Ticket, user: User | null | undefined): boolean => {
  const ids = userIdentityIds(user);
  const assignedId = toId(ticket.assigned_technician_profile_id) || toId(ticket.assigned_technician_id);
  if (ids.length && assignedId && ids.includes(assignedId)) return true;
  return intersects(ticketAssignedKeys(ticket), userIdentityKeys(user));
};

export const isTicketCreatedByUser = (ticket: Ticket, user: User | null | undefined): boolean => {
  // Match by customer_id when backend links tickets via UUID (most reliable for customers)
  const ticketCustomerId = ticket.customer_id ? toId(ticket.customer_id) : '';
  const userIds = userIdentityIds(user);
  if (ticketCustomerId && userIds.length && userIds.includes(ticketCustomerId)) return true;
  // Fallback: match by created_by / customer display name
  return intersects(ticketCreatedByKeys(ticket), userIdentityKeys(user));
};

