import type { User } from '@/context/AuthContext';

const str = (v: unknown): string =>
  typeof v === 'string' && v.trim() ? v.trim() : '';

/** Full name for display: first_name_display/first_name + last_name_display/last_name, fallback username */
export function getDisplayFullName(user: User | null | undefined): string {
  if (!user) return '';
  const first = str(user.first_name_display) || str(user.first_name);
  const last = str(user.last_name_display) || str(user.last_name);
  const full = [first, last].filter(Boolean).join(' ').trim();
  return full || str(user.username) || 'User';
}

/** Email for display (normalized from email_display/email in AuthContext) */
export function getDisplayEmail(user: User | null | undefined): string {
  if (!user) return '';
  return str(user.email) || '—';
}

/** Phone for display */
export function getDisplayPhone(user: User | null | undefined): string {
  if (!user) return '';
  return str(user.phone) || '—';
}

/** Station for display */
export function getDisplayStation(user: User | null | undefined): string {
  if (!user) return '';
  return str(user.station_name) || '—';
}

/** City for display */
export function getDisplayCity(user: User | null | undefined): string {
  if (!user) return '';
  return str(user.city) || '—';
}

/** Location = city and state of station (e.g. "Indianapolis, IN") */
export function getDisplayLocation(user: User | null | undefined): string {
  if (!user) return '';
  const city = str(user.city);
  const state = str(user.state);
  if (city && state) return `${city}, ${state}`;
  return city || state || '—';
}
