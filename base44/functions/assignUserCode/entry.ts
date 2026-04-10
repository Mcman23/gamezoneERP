import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function generateCode() {
  const len = Math.floor(Math.random() * 3) + 4; // 4, 5, or 6
  const min = Math.pow(10, len - 1);
  const max = Math.pow(10, len) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const userId = body.user_id || body?.event?.entity_id || body?.data?.id;

    if (!userId) {
      return Response.json({ error: 'user_id required' }, { status: 400 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list();
    const existingCodes = new Set(allUsers.map(u => u.user_code).filter(Boolean));

    // Check if already has code
    const targetUser = allUsers.find(u => u.id === userId);
    if (targetUser?.user_code) {
      return Response.json({ user_code: targetUser.user_code, skipped: true });
    }

    let code;
    let attempts = 0;
    do {
      code = generateCode();
      attempts++;
    } while (existingCodes.has(code) && attempts < 100);

    await base44.asServiceRole.entities.User.update(userId, { user_code: code });
    return Response.json({ user_code: code });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});