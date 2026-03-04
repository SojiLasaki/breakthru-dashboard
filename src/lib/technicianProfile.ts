/**
 * Mirrors Django TechnicianProfile model choices.
 * API sends lowercase values: engine, electrical, junior, mid, senior, available, busy, unavailable.
 */

export const EXPERTISE_LEVEL = {
  junior: 'Junior',
  mid: 'Mid',
  senior: 'Senior',
} as const;

export type ExpertiseLevel = keyof typeof EXPERTISE_LEVEL;

export const SPECIALIZATION_POSITION = {
  engine: 'Engine Technician',
  electrical: 'Electrical Technician',
} as const;

export type SpecializationPosition = keyof typeof SPECIALIZATION_POSITION;

export const TECHNICIAN_STATUS = {
  available: 'Available',
  busy: 'Busy',
  unavailable: 'Unavailable',
} as const;

export type TechnicianStatus = keyof typeof TECHNICIAN_STATUS;

/** Display label for expertise (API value is lowercase). */
export function getExpertiseLabel(value: string | undefined): string {
  if (!value) return '—';
  const key = value.toLowerCase() as ExpertiseLevel;
  return EXPERTISE_LEVEL[key] ?? value;
}

/** Display label for specialization (API value is lowercase, e.g. engine | electrical). */
export function getSpecializationLabel(value: string | undefined): string {
  if (!value) return '—';
  const key = value.toLowerCase() as SpecializationPosition;
  return SPECIALIZATION_POSITION[key] ?? value.replace(/_/g, ' ');
}

/** Display label for technician status. */
export function getStatusLabel(value: string | undefined): string {
  if (!value) return '—';
  const key = value.toLowerCase() as TechnicianStatus;
  return TECHNICIAN_STATUS[key] ?? value;
}

/** CSS class for status badge (available=green, busy=yellow, unavailable=gray). */
export const STATUS_CLASS: Record<string, string> = {
  available: 'text-green-400 bg-green-400/10 border border-green-400/20',
  busy: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20',
  unavailable: 'text-muted-foreground bg-muted/50 border border-border',
};

/** Dot color for status indicator (e.g. avatar ring). */
export const STATUS_DOT: Record<string, string> = {
  available: 'bg-green-400',
  busy: 'bg-yellow-400',
  unavailable: 'bg-muted-foreground',
};

/** CSS class for expertise badge. */
export const EXPERTISE_CLASS: Record<string, string> = {
  junior: 'text-blue-400 bg-blue-400/10 border border-blue-400/20',
  mid: 'text-purple-400 bg-purple-400/10 border border-purple-400/20',
  senior: 'text-amber-400 bg-amber-400/10 border border-amber-400/20',
};

/** Star count for expertise (1–3). */
export function getExpertiseStars(value: string | undefined): number {
  const key = (value ?? '').toLowerCase();
  if (key === 'junior') return 1;
  if (key === 'mid') return 2;
  if (key === 'senior') return 3;
  return 1;
}
