import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function generateCode() {
  const len = Math.floor(Math.random() * 3) + 4;
  const min = Math.pow(10, len - 1);
  const max = Math.pow(10, len) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin' && user?.role !== 'owner') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list();
    const existingCodes = new Set(allUsers.map(u => u.user_code).filter(Boolean));
    const without = allUsers.filter(u => !u.user_code);

    let assigned = 0;
    for (const u of without) {
      let code;
      let attempts = 0;
      do {
        code = generateCode();
        attempts++;
      } while (existingCodes.has(code) && attempts < 100);
      existingCodes.add(code);
      await base44.asServiceRole.entities.User.update(u.id, { user_code: code });
      assigned++;
    }

    return Response.json({ assigned, total: allUsers.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});