// Returns the effective club_owner_id for filtering entities
// Owner → system-wide (no filter needed, handled per page)
// Admin → user.club_owner_id if set, otherwise user.id (self-owner)
// Cashier (user role) → their club_owner_id field (set by admin)
export function useClub(user) {
  if (!user) return { clubOwnerId: null, isAdmin: false, isOwner: false, isCashier: false, isLinked: false };
  const isOwner = user.role === 'owner';
  const isAdmin = user.role === 'admin';
  const isCashier = user.role === 'user';
  // Admin: use club_owner_id if set (shared club), fallback to own id (self-owner)
  const clubOwnerId = isAdmin
    ? (user.club_owner_id || user.id)
    : (isCashier ? (user.club_owner_id || null) : null);
  return { clubOwnerId, isAdmin, isOwner, isCashier, isLinked: !!clubOwnerId };
}

// Fetch club-scoped entities — single query, RLS handles the filtering
export async function fetchClubEntities(entityApi, user, extraFilter = {}, sort, limit) {
  if (!user) return [];
  const isOwner = user.role === 'owner';
  const isAdmin = user.role === 'admin';
  const isCashier = user.role === 'user';

  if (isOwner) return limit ? entityApi.list(sort, limit) : entityApi.list(sort);

  // Effective owner id: admin's own club_owner_id (if shared) or their own id; cashier's club_owner_id
  const ownerId = isAdmin
    ? (user.club_owner_id || user.id)
    : isCashier
      ? user.club_owner_id
      : null;

  if (!ownerId) return [];

  const filter = { club_owner_id: ownerId, ...extraFilter };
  return entityApi.filter(filter, sort, limit || 500);
}