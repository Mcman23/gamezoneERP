const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

// Returns the effective club_owner_id for filtering entities
// Owner  → null (no filter, sees everything)
// Admin  → user.id (their own club)
// Cashier (role: 'user') → user.club_owner_id (set by admin when linking)
export function useClub(user) {
  if (!user) return { clubOwnerId: null, isAdmin: false, isOwner: false, isCashier: false, isLinked: false };
  const isOwner   = user.role === 'owner';
  const isAdmin   = user.role === 'admin';
  const isCashier = user.role === 'user';

  // CRITICAL FIX: kassir ucun yalniz club_owner_id istifade et
  // user.id fallback-i silindi - cunku user.id kassirin oz id-sidir, admin deyil
  const clubOwnerId = isOwner
    ? null
    : isAdmin
    ? user.id
    : isCashier
    ? (user.club_owner_id || null)
    : null;

  return {
    clubOwnerId,
    isAdmin,
    isOwner,
    isCashier,
    isLinked: isCashier ? !!user.club_owner_id : true,
  };
}

// Backward-compatible entity fetch with proper multi-tenant filtering
export async function fetchClubEntities(entityApi, user, extraFilter = {}, sort, limit) {
  if (!user) return [];

  const isOwner   = user.role === 'owner';
  const isAdmin   = user.role === 'admin';
  const isCashier = user.role === 'user';

  if (isOwner) {
    return limit ? entityApi.list(sort, limit) : entityApi.list(sort);
  }

  if (isAdmin) {
    const ownerId = user.id;
    const [byOwner, byCreator] = await Promise.all([
      entityApi.filter({ club_owner_id: ownerId, ...extraFilter }, sort, limit || 500),
      entityApi.filter({ created_by: user.email, ...extraFilter }, sort, limit || 500),
    ]);
    const map = {};
    byOwner.forEach(r => { map[r.id] = r; });
    byCreator.forEach(r => { if (!r.club_owner_id && !map[r.id]) map[r.id] = r; });
    return Object.values(map);
  }

  if (isCashier) {
    const ownerId = user.club_owner_id;
    if (!ownerId) {
      console.warn('Kassir kluba baglanmayib (club_owner_id yoxdur)');
      return [];
    }
    return entityApi.filter({ club_owner_id: ownerId, ...extraFilter }, sort, limit || 500);
  }

  return [];
}
