export const TICKET_STATUS_BADGE_CLASS: Record<string, string> = {
  open: 'status-open',
  pending: 'status-open',
  assigned: 'status-open',
  in_progress: 'status-in-progress',
  awaiting_parts: 'status-in-progress',
  awaiting_approval: 'status-urgent',
  urgent: 'status-urgent',
  completed: 'status-closed',
  closed: 'status-closed',
};

export const TICKET_STATUS_TEXT_CLASS: Record<string, string> = {
  open: 'text-blue-400',
  pending: 'text-blue-400',
  assigned: 'text-blue-400',
  in_progress: 'text-yellow-400',
  awaiting_parts: 'text-yellow-400',
  awaiting_approval: 'text-red-400',
  urgent: 'text-red-400',
  completed: 'text-green-400',
  closed: 'text-green-400',
};

export const TICKET_PRIORITY_LABEL: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Severe',
  5: 'Critical',
};

export const TICKET_PRIORITY_BADGE_CLASS: Record<number, string> = {
  1: 'text-muted-foreground bg-muted/50 border border-border',
  2: 'text-blue-400 bg-blue-400/10 border border-blue-400/20',
  3: 'text-orange-400 bg-orange-400/10 border border-orange-400/20',
  4: 'text-primary bg-primary/10 border border-primary/20',
  5: 'text-primary bg-primary/10 border border-primary/20',
};

export const ticketStatusBadgeClass = (status?: string): string => {
  const key = (status || '').toLowerCase();
  return TICKET_STATUS_BADGE_CLASS[key] || '';
};

export const ticketStatusTextClass = (status?: string): string => {
  const key = (status || '').toLowerCase();
  return TICKET_STATUS_TEXT_CLASS[key] || 'text-muted-foreground';
};

export const ticketPriorityBadgeClass = (priority?: number): string => {
  if (typeof priority !== 'number' || !Number.isFinite(priority)) return TICKET_PRIORITY_BADGE_CLASS[1];
  return TICKET_PRIORITY_BADGE_CLASS[priority] || TICKET_PRIORITY_BADGE_CLASS[1];
};

export const ticketPriorityLabel = (priority?: number): string => {
  if (typeof priority !== 'number' || !Number.isFinite(priority)) return '';
  return TICKET_PRIORITY_LABEL[priority] || String(priority);
};

