import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller || (caller.role !== 'admin' && caller.role !== 'owner')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { full_name, email, phone, club_owner_id } = body;

    if (!email || !email.trim()) {
      return Response.json({ error: 'Email məcburidir' }, { status: 400 });
    }
    if (!full_name || !full_name.trim()) {
      return Response.json({ error: 'Ad Soyad məcburidir' }, { status: 400 });
    }
    if (!club_owner_id) {
      return Response.json({ error: 'club_owner_id məcburidir' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const password = generatePassword();
    const userCode = generateCode();

    // Check if user already exists
    const allUsers = await base44.asServiceRole.entities.User.list();
    const existingUser = allUsers.find(u => u.email === normalizedEmail);

    if (existingUser) {
      // User exists — update their club association
      await base44.asServiceRole.entities.User.update(existingUser.id, {
        club_owner_id: club_owner_id,
        role: 'user',
        user_code: existingUser.user_code || userCode,
        ...(phone ? { phone } : {}),
      });

      return Response.json({
        success: true,
        message: 'Mövcud istifadəçi kluba bağlandı',
        password: null,
        user_code: existingUser.user_code || userCode,
        existing: true,
      });
    }

    // Register new user with email + password directly
    await base44.auth.register({ email: normalizedEmail, password });

    // Poll for user record to appear (max 6 seconds)
    let newUser = null;
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const users = await base44.asServiceRole.entities.User.list();
      newUser = users.find(u => u.email === normalizedEmail);
      if (newUser) break;
    }

    if (!newUser) {
      return Response.json({ error: 'İstifadəçi yaradıldı lakin tapılmadı. Bir az gözləyib yenidən yoxlayın.' }, { status: 500 });
    }

    // Update user with club info, name, code
    await base44.asServiceRole.entities.User.update(newUser.id, {
      club_owner_id: club_owner_id,
      role: 'user',
      user_code: userCode,
      ...(phone ? { phone } : {}),
    });

    return Response.json({
      success: true,
      message: 'Kassir uğurla yaradıldı',
      password,
      user_code: userCode,
      email: normalizedEmail,
      existing: false,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});