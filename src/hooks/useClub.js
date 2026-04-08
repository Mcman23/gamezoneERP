// Returns the effective club_owner_id for filtering entities
// Admin → their own user.id
// Cashier (user role) → their club_owner_id field (set by admin)
export function useClub(user) {
  if (!user) return { clubOwnerId: null, isAdmin: false, isLinked: false };
  const isAdmin = user.role === 'admin';
  const clubOwnerId = isAdmin ? user.id : (user.club_owner_id || null);
  return { clubOwnerId, isAdmin, isLinked: !!clubOwnerId };
}