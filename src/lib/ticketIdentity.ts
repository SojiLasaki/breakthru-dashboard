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
  return uniqueNonEmpty([
    fullNameFrom(user.first_name, user.last_name),
    user.username,
    user.email,
    user.first_name,
    user.last_name,
  ]);
};

const ticketAssignedKeys = (ticket: Ticket): string[] =>
  uniqueNonEmpty([
    ticket.assigned_to,
    ticket.assigned_technician,
    ticket.assigned_technician_profile_id,
    fullNameFrom(ticket.assigned_technician_first_name, ticket.assigned_technician_last_name),
  ]);

const toId = (v: unknown): string => {
  if (v == null) return '';
  if (typeof v === 'string' && v.trim()) return String(v).trim().toLowerCase();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
};

const userIdentityIds = (user: User | null | undefined): string[] =>
  uniqueNonEmpty([toId(user?.id), toId(user?.technician_profile_id)]);

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
  const assignedId = toId(ticket.assigned_technician_profile_id);
  if (ids.length && assignedId && ids.includes(assignedId)) return true;
  return intersects(ticketAssignedKeys(ticket), userIdentityKeys(user));
};

export const isTicketCreatedByUser = (ticket: Ticket, user: User | null | undefined): boolean =>
  intersects(ticketCreatedByKeys(ticket), userIdentityKeys(user));

