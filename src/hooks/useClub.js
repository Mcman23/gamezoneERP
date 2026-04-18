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

  // Cashier: rely on RLS rules (club_owner_id = user.club_owner_id), just filter by extraFilter
  if (isCashier) {
    const ownerId = user.club_owner_id;
    if (!ownerId) return [];
    return extraFilter && Object.keys(extraFilter).length > 0
      ? entityApi.filter({ club_owner_id: ownerId, ...extraFilter }, sort, limit || 500)
      : entityApi.filter({ club_owner_id: ownerId }, sort, limit || 500);
  }

  // Admin
  const ownerId = user.id;

  const [byOwner, byCreator] = await Promise.all([
    entityApi.filter({ club_owner_id: ownerId, ...extraFilter }, sort, limit || 500),
    entityApi.filter({ created_by: user.email, ...extraFilter }, sort, limit || 500),
  ]);

  const map = {};
  byOwner.forEach(r => { map[r.id] = r; });
  // Only include creator records that have NO club_owner_id (old records before multi-tenancy)
  byCreator.forEach(r => { if (!r.club_owner_id && !map[r.id]) map[r.id] = r; });
  return Object.values(map);
}