import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 8; i++) {
    pass += chars[Math.floor(Math.random() * chars.length)];
  }
  return pass;
}

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 900000)).slice(0, 6);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { full_name, email, phone, club_owner_id } = await req.json();
    if (!email && !phone) {
      return Response.json({ error: 'Email və ya telefon məcburidir' }, { status: 400 });
    }
    if (!full_name) {
      return Response.json({ error: 'Ad Soyad məcburidir' }, { status: 400 });
    }
    if (!club_owner_id) {
      return Response.json({ error: 'club_owner_id məcburidir' }, { status: 400 });
    }
    if (!email) {
      return Response.json({ error: 'Qeydiyyat üçün email ünvanı məcburidir' }, { status: 400 });
    }

    const password = generatePassword();
    const userCode = generateCode();

    // Invite user via platform
    await base44.users.inviteUser(email, 'user');

    // Wait a moment for the user record to be created
    await new Promise(r => setTimeout(r, 2000));

    // Find the newly created user by email
    const allUsers = await base44.asServiceRole.entities.User.list();
    const newUser = allUsers.find(u => u.email === email);

    if (newUser) {
      await base44.asServiceRole.entities.User.update(newUser.id, {
        club_owner_id: club_owner_id,
        role: 'user',
        user_code: userCode,
      });
    }

    // Send email with credentials
    const clubName = user.club_name || 'Klub';
    const emailBody = `
Salam ${full_name},

Siz ${clubName} sisteminə kassir kimi qeydiyyatdan keçirildiniz.

📧 Giriş məlumatlarınız:
━━━━━━━━━━━━━━━━━━━━━━━
🔑 Email: ${email}
🔒 Şifrə: ${password}
━━━━━━━━━━━━━━━━━━━━━━━

Sistemə daxil olmaq üçün əvvəlcə email təsdiqini edin,
sonra yuxarıdakı şifrə ilə giriş edin.

${phone ? `📱 Qeyd edilmiş telefon: ${phone}` : ''}

Hər hansı sualınız olarsa, admin ilə əlaqə saxlayın.

Hörmətlə,
${clubName} Sistemi
    `.trim();

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `${clubName} — Kassir girişi məlumatları`,
      body: emailBody,
    });

    return Response.json({
      success: true,
      message: 'Kassir qeydiyyatdan keçirildi və email göndərildi',
      password,
      user_code: userCode,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});