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