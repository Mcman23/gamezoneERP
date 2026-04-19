/**
 * Auto-recovery: fixes device-session state mismatches.
 * - Tables stuck as "occupied" with no active session → freed
 * - Active sessions whose end_time passed >30min ago → auto-closed
 * 
 * Called by a scheduled automation every 15 minutes.
 * Also callable manually by admins.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Allow admins or scheduled (no user) calls
    if (user && user.role !== 'admin' && user.role !== 'owner') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [allTables, allSessions] = await Promise.all([
      base44.asServiceRole.entities.GameTable.list(),
      base44.asServiceRole.entities.Session.filter({ status: 'active' }),
    ]);

    const activeSessionsByTableId = {};
    allSessions.forEach(s => { activeSessionsByTableId[s.table_id] = s; });

    const now = new Date();
    const fixes = [];

    for (const table of allTables) {
      const activeSession = activeSessionsByTableId[table.id];

      // Case 1: Table is "occupied" but no active/paused session exists
      if (table.status === 'occupied' && !activeSession) {
        await base44.asServiceRole.entities.GameTable.update(table.id, {
          status: 'available',
          current_session_id: '',
        });
        fixes.push({ type: 'stale_table', table: table.name });
        continue;
      }

      // Case 2: Table is "available" but has an active session (mismatch)
      if (table.status === 'available' && activeSession) {
        await base44.asServiceRole.entities.GameTable.update(table.id, {
          status: 'occupied',
          current_session_id: activeSession.id,
        });
        fixes.push({ type: 'mismatch_fix', table: table.name });
        continue;
      }

      // Case 3: Non-unlimited session end_time passed by more than 30 minutes
      if (
        activeSession &&
        !activeSession.is_unlimited &&
        activeSession.end_time
      ) {
        const endTime = new Date(activeSession.end_time);
        const overrunMs = now - endTime;
        if (overrunMs > 0) {
          const durationMinutes = activeSession.duration_minutes || 0;
          const sessionCost = activeSession.session_cost || 0;
          const totalCost = sessionCost + (activeSession.orders_cost || 0);

          await base44.asServiceRole.entities.Session.update(activeSession.id, {
            status: 'completed',
            end_time: now.toISOString(),
            total_cost: totalCost,
            paid: false, // unpaid — cashier must reconcile
          });
          await base44.asServiceRole.entities.GameTable.update(table.id, {
            status: 'available',
            current_session_id: '',
          });
          fixes.push({ type: 'expired_session', table: table.name, session_id: activeSession.id });
        }
      }
    }

    return Response.json({
      status: 'success',
      message: fixes.length > 0 ? `${fixes.length} problem avtomatik düzəldildi` : 'Sistem sağlam — problem yoxdur',
      data: { fixes, checked_tables: allTables.length, checked_sessions: allSessions.length },
    });

  } catch (error) {
    return Response.json({ status: 'error', message: error.message }, { status: 500 });
  }
});