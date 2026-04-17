import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller || (caller.role !== 'admin' && caller.role !== 'owner')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { target_user_id } = body;

    if (!target_user_id) {
      return Response.json({ error: 'target_user_id məcburidir' }, { status: 400 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.id === target_user_id);

    if (!targetUser) {
      return Response.json({ error: 'İstifadəçi tapılmadı' }, { status: 404 });
    }

    if (targetUser.role === 'owner') {
      return Response.json({ error: 'Owner silinə bilməz' }, { status: 403 });
    }

    await base44.asServiceRole.entities.User.delete(target_user_id);

    return Response.json({ success: true, message: 'İstifadəçi silindi' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});