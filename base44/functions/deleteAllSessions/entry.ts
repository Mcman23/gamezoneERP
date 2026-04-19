import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all sessions using service role (bypasses RLS)
    const allSessions = await base44.asServiceRole.entities.Session.list('-created_date', 500);

    let deletedCount = 0;
    for (const session of allSessions) {
      try {
        await base44.asServiceRole.entities.Session.delete(session.id);
        deletedCount++;
      } catch (_) {
        // skip if not found
      }
    }

    return Response.json({ success: true, deleted: deletedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});