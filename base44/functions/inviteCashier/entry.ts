import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
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
      // User exists — just update their club association
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

    // Invite new user via platform (platform sends the registration email automatically)
    await base44.users.inviteUser(normalizedEmail, 'user');

    // Poll for user record to appear (max 8 seconds)
    let newUser = null;
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const users = await base44.asServiceRole.entities.User.list();
      newUser = users.find(u => u.email === normalizedEmail);
      if (newUser) break;
    }

    if (newUser) {
      // Update user with club info, name, code
      await base44.asServiceRole.entities.User.update(newUser.id, {
        club_owner_id: club_owner_id,
        role: 'user',
        user_code: userCode,
        ...(phone ? { phone } : {}),
      });
    }

    // Try to send credentials email — if fails, still return success with password
    let emailSent = false;
    try {
      const clubName = caller.club_name || 'Oyun Mərkəzi';
      await base44.integrations.Core.SendEmail({
        to: normalizedEmail,
        subject: `${clubName} — Kassir hesabı yaradıldı`,
        body: `Salam ${full_name},\n\nSiz ${clubName} sisteminə kassir kimi əlavə edildiniz.\n\nGiriş məlumatlarınız:\n📧 Email: ${normalizedEmail}\n🔑 Müvəqqəti şifrə: ${password}\n\nSistemi ilk dəfə açdığınızda bu şifrə ilə daxil olun və dəyişdirin.\n\n${phone ? `Telefon: ${phone}\n` : ''}Hörmətlə,\n${clubName}`,
      });
      emailSent = true;
    } catch (_emailError) {
      // Email sending failed — admin will see password in UI
      emailSent = false;
    }

    return Response.json({
      success: true,
      message: emailSent
        ? 'Kassir yaradıldı və email göndərildi'
        : 'Kassir yaradıldı (email göndərilmədi — şifrəni əl ilə bildirin)',
      password,
      user_code: userCode,
      email_sent: emailSent,
      existing: false,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});