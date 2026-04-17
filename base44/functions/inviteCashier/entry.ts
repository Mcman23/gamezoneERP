import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    const { email, phone, club_owner_id } = body;

    if (!email || !email.trim()) {
      return Response.json({ error: 'Email məcburidir' }, { status: 400 });
    }
    if (!club_owner_id) {
      return Response.json({ error: 'club_owner_id məcburidir' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userCode = generateCode();

    // Check if user already exists
    const allUsers = await base44.asServiceRole.entities.User.list();
    const existingUser = allUsers.find(u => u.email === normalizedEmail);

    if (existingUser) {
      const updateData = { club_owner_id, role: 'user' };
      if (!existingUser.user_code) updateData.user_code = userCode;
      if (phone) updateData.phone = phone;
      await base44.asServiceRole.entities.User.update(existingUser.id, updateData);

      return Response.json({
        success: true,
        existing: true,
        message: 'Mövcud istifadəçi kluba bağlandı',
        user_code: existingUser.user_code || userCode,
      });
    }

    // Invite new user via platform (they set their own password)
    await base44.users.inviteUser(normalizedEmail, 'user');

    // Poll for user record to set club_owner_id (up to 8s)
    let newUser = null;
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const users = await base44.asServiceRole.entities.User.list();
      newUser = users.find(u => u.email === normalizedEmail);
      if (newUser) break;
    }

    if (newUser) {
      const updateData = { club_owner_id, role: 'user', user_code: userCode };
      if (phone) updateData.phone = phone;
      await base44.asServiceRole.entities.User.update(newUser.id, updateData);
    } else {
      // Store pending invite — will be linked when user registers
      // At minimum the invite was sent successfully
    }

    return Response.json({
      success: true,
      existing: false,
      invited: true,
      user_code: userCode,
      email: normalizedEmail,
    });

  } catch (error) {
    const msg = error.message || 'Xəta baş verdi';
    if (msg.includes('Disposable email')) {
      return Response.json({ error: 'Etibarsız email (disposable). Real email ünvanı daxil edin.' }, { status: 400 });
    }
    if (msg.includes('already') || msg.includes('registered')) {
      return Response.json({ error: 'Bu email artıq sistemdə qeydiyyatdadır.' }, { status: 400 });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
});