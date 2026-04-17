import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
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
    const { email, phone, club_owner_id } = body;

    if (!email || !email.trim()) {
      return Response.json({ error: 'Email məcburidir' }, { status: 400 });
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

    // Register new user with email + password
    await base44.auth.register({ email: normalizedEmail, password });

    // Poll for user record (up to 8s)
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
    }

    // Send password via email using platform integration
    let emailSent = false;
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: normalizedEmail,
        subject: 'Kassir hesabınız yaradıldı — Giriş məlumatları',
        body: `Salam,

Sizin kassir hesabınız yaradıldı. Aşağıdakı məlumatlarla sistemə daxil ola bilərsiniz:

📧 Email: ${normalizedEmail}
🔑 Şifrə: ${password}

Daxil olmaq üçün sistem linkini açın və bu məlumatları daxil edin.

İlk girişdən sonra şifrənizi dəyişdirməyiniz tövsiyə olunur.

Hörmətlə,
İdarəetmə Sistemi`,
      });
      emailSent = true;
    } catch (emailErr) {
      // Email failed but user was created — return password to show in UI
      emailSent = false;
    }

    return Response.json({
      success: true,
      existing: false,
      email_sent: emailSent,
      password: emailSent ? null : password, // Only expose if email failed
      show_password: !emailSent,
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