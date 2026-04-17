import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { target_user_id } = await req.json();
    if (!target_user_id) {
      return Response.json({ error: 'target_user_id required' }, { status: 400 });
    }

    // Safety: only delete users with role 'user' that belong to this admin
    const targets = await base44.asServiceRole.entities.User.filter({ id: target_user_id });
    if (targets.length === 0) {
      return Response.json({ error: 'İstifadəçi tapılmadı' }, { status: 404 });
    }
    const target = targets[0];
    if (target.role !== 'user') {
      return Response.json({ error: 'Yalnız kassir rolundakı istifadəçilər silinə bilər' }, { status: 403 });
    }
    // Ensure this cashier belongs to the requesting admin (unless owner)
    if (user.role === 'admin' && target.club_owner_id !== user.id) {
      return Response.json({ error: 'Bu kassir sizin klubunuza aid deyil' }, { status: 403 });
    }

    await base44.asServiceRole.entities.User.delete(target_user_id);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});