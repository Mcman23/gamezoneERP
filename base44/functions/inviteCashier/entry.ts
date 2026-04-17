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

    // Check if user already exists in the system
    const allUsers = await base44.asServiceRole.entities.User.list();
    const existingUser = allUsers.find(u => u.email === normalizedEmail);

    if (existingUser) {
      // Already registered — just link them to this club
      const updateData = {
        club_owner_id: club_owner_id,
        role: 'user',
      };
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

    // New user — send platform invite email (they set their own password via email link)
    await base44.users.inviteUser(normalizedEmail, 'user');

    // After invite, poll for the user record to appear (up to 8 seconds)
    let newUser = null;
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const users = await base44.asServiceRole.entities.User.list();
      newUser = users.find(u => u.email === normalizedEmail);
      if (newUser) break;
    }

    if (newUser) {
      const updateData = {
        club_owner_id: club_owner_id,
        role: 'user',
        user_code: userCode,
      };
      if (phone) updateData.phone = phone;
      await base44.asServiceRole.entities.User.update(newUser.id, updateData);
    } else {
      // Store pending — admin must manually link later once user registers
      // We still return success because invite email was sent
    }

    return Response.json({
      success: true,
      existing: false,
      invited: true,
      message: 'Dəvət emaili göndərildi',
      user_code: newUser ? userCode : null,
    });

  } catch (error) {
    const msg = error.message || 'Xəta baş verdi';
    // Translate known errors
    if (msg.includes('already') || msg.includes('registered')) {
      return Response.json({ error: 'Bu email artıq sistemdə qeydiyyatdadır.' }, { status: 400 });
    }
    return Response.json({ error: msg }, { status: 500 });
  }
});