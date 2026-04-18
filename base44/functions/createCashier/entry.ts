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
    const { email, phone, password, club_owner_id } = body;

    if (!email || !password || !club_owner_id) {
      return Response.json({ error: 'email, password və club_owner_id məcburidir' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const allUsers = await base44.asServiceRole.entities.User.list();
    const existingUser = allUsers.find((u) => u.email === normalizedEmail);

    if (!existingUser) {
      return Response.json({
        error: 'Bu email sistemdə qeydiyyatdan keçməyib. Əvvəlcə həmin cihazdan bir dəfə qeydiyyat/giriş edilməlidir, sonra bu istifadəçini kassir kimi bağlaya bilərsiniz.'
      }, { status: 400 });
    }

    if (existingUser.role === 'owner') {
      return Response.json({ error: 'Owner hesabı kassir edilə bilməz' }, { status: 403 });
    }

    await base44.asServiceRole.entities.User.update(existingUser.id, {
      role: 'user',
      club_owner_id,
      phone: phone || existingUser.phone || '',
      temp_password: password,
      user_code: existingUser.user_code || randomCode(6),
    });

    return Response.json({
      success: true,
      email: normalizedEmail,
      password,
      message: 'Kassir kluba bağlandı'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});