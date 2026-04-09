// Returns the effective club_owner_id for filtering entities
// Owner → system-wide (no filter needed, handled per page)
// Admin → their own user.id
// Cashier (user role) → their club_owner_id field (set by admin)
export function useClub(user) {
  if (!user) return { clubOwnerId: null, isAdmin: false, isOwner: false, isCashier: false, isLinked: false };
  const isOwner = user.role === 'owner';
  const isAdmin = user.role === 'admin';
  const isCashier = user.role === 'user';
  const clubOwnerId = isAdmin ? user.id : (isCashier ? (user.club_owner_id || null) : null);
  return { clubOwnerId, isAdmin, isOwner, isCashier, isLinked: !!clubOwnerId };
}

// Backward-compatible entity fetch:
// Returns records where club_owner_id matches OR (club_owner_id is null AND created by same admin)
export async function fetchClubEntities(entityApi, user, extraFilter = {}, sort, limit) {
  if (!user) return [];
  const isAdmin = user.role === 'admin';
  const isCashier = user.role === 'user';
  const isOwner = user.role === 'owner';

  if (isOwner) return limit ? entityApi.list(sort, limit) : entityApi.list(sort);

  const ownerId = isAdmin ? user.id : (isCashier ? user.club_owner_id : null);
  if (!ownerId) return [];

  const [byOwner, byCreator] = await Promise.all([
    entityApi.filter({ club_owner_id: ownerId, ...extraFilter }, sort, limit || 500),
    isAdmin
      ? entityApi.filter({ created_by: user.email, ...extraFilter }, sort, limit || 500)
      : Promise.resolve([]),
  ]);

  const map = {};
  byOwner.forEach(r => { map[r.id] = r; });
  // Only include creator records that have NO club_owner_id (old records before multi-tenancy)
  byCreator.forEach(r => { if (!r.club_owner_id && !map[r.id]) map[r.id] = r; });
  return Object.values(map);
}