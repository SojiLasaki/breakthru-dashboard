import type { User } from '@/context/AuthContext';

function norm(s: string | null | undefined): string {
  return (s ?? '').toString().trim().toLowerCase();
}

/**
 * Returns true if the logged-in user has no station set (show all),
 * or if the entity's station matches the user's station by id or name.
 * Use for admin/staff views to restrict to "my station" only.
 */
export function isInSameStation(
  entity: { station?: string | null },
  user: User | null | undefined
): boolean {
  if (!user) return true;
  const userStationId = norm(user.station);
  const userStationName = norm(user.station_name);
  if (!userStationId && !userStationName) return true;

  const entityStation = norm(entity.station);
  if (!entityStation) return false;
  return entityStation === userStationId || entityStation === userStationName;
}
