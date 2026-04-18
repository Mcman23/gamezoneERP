import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function randomCode(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller || (caller.role !== 'admin' && caller.role !== 'owner')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { email, phone, club_owner_id } = body;

    if (!email || !club_owner_id) {
      return Response.json({ error: 'email və club_owner_id məcburidir' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const allUsers = await base44.asServiceRole.entities.User.list();
    const existingUser = allUsers.find((u) => u.email === normalizedEmail);

    if (existingUser) {
      if (existingUser.role === 'owner') {
        return Response.json({ error: 'Owner hesabı kassir edilə bilməz' }, { status: 403 });
      }

      await base44.asServiceRole.entities.User.update(existingUser.id, {
        role: 'user',
        club_owner_id,
        phone: phone || existingUser.phone || '',
        user_code: existingUser.user_code || randomCode(6),
      });

      return Response.json({
        success: true,
        existing: true,
        email: normalizedEmail,
        message: 'Mövcud istifadəçi kassir kimi kluba bağlandı'
      });
    }

    await base44.users.inviteUser(normalizedEmail, 'user');

    let invitedUser = null;
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const users = await base44.asServiceRole.entities.User.list();
      invitedUser = users.find((u) => u.email === normalizedEmail);
      if (invitedUser) break;
    }

    if (invitedUser) {
      await base44.asServiceRole.entities.User.update(invitedUser.id, {
        role: 'user',
        club_owner_id,
        phone: phone || invitedUser.phone || '',
        user_code: invitedUser.user_code || randomCode(6),
      });
    }

    return Response.json({
      success: true,
      invited: true,
      email: normalizedEmail,
      message: 'Dəvət göndərildi, kassir ilk girişdən sonra kluba bağlanacaq'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});