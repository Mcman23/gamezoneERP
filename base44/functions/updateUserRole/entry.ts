import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller || (caller.role !== 'admin' && caller.role !== 'owner')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { target_user_id, role, club_owner_id } = body;

    if (!target_user_id || !role) {
      return Response.json({ error: 'target_user_id and role required' }, { status: 400 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list();
    const targetUser = allUsers.find(u => u.id === target_user_id);

    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.role === 'owner') {
      return Response.json({ error: 'Owner rolunu dəyişmək olmaz' }, { status: 403 });
    }

    const updateData = { role };
    if (typeof club_owner_id !== 'undefined') {
      updateData.club_owner_id = club_owner_id || '';
    }

    await base44.asServiceRole.entities.User.update(target_user_id, updateData);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});