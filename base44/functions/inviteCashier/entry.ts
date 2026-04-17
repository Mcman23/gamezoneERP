import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { email, full_name, phone_number } = await req.json();

    if (!email && !phone_number) {
      return Response.json({ error: 'Email və ya telefon nömrəsi mütləqdir' }, { status: 400 });
    }
    if (!full_name) {
      return Response.json({ error: 'Ad soyad mütləqdir' }, { status: 400 });
    }

    // Check if user already exists
    if (email) {
      const existing = await base44.asServiceRole.entities.User.filter({ email });
      if (existing.length > 0) {
        // Link existing user to this admin's club
        await base44.asServiceRole.entities.User.update(existing[0].id, {
          club_owner_id: user.id,
          role: 'user',
        });
        return Response.json({ success: true, existing: true, user_id: existing[0].id });
      }
    }

    // Invite new user via platform invite
    const inviteResult = await base44.users.inviteUser(email, 'user');

    // After invite, find the new user and set club_owner_id
    if (email) {
      // Poll briefly for the newly created user
      let newUser = null;
      for (let i = 0; i < 5; i++) {
        const found = await base44.asServiceRole.entities.User.filter({ email });
        if (found.length > 0) { newUser = found[0]; break; }
        await new Promise(r => setTimeout(r, 500));
      }
      if (newUser) {
        await base44.asServiceRole.entities.User.update(newUser.id, {
          club_owner_id: user.id,
          role: 'user',
        });
      }
    }

    return Response.json({ success: true, existing: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});