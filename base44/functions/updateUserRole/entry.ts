import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { target_user_id, role, club_owner_id } = await req.json();
    if (!target_user_id || !role) {
      return Response.json({ error: 'target_user_id and role required' }, { status: 400 });
    }

    const updateData = { role };
    // Always set club_owner_id if provided (even empty string to unlink)
    if (typeof club_owner_id !== 'undefined') {
      updateData.club_owner_id = club_owner_id || '';
    }

    await base44.asServiceRole.entities.User.update(target_user_id, updateData);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});