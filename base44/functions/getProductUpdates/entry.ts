const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ═══════════════════════════════════════════════════════════════════════
//  COMBINED ENDPOINT: Product Updates + Session Command
//
//  If body contains "table_id" → returns session/lock command for .exe
//  Otherwise → returns product list for kiosk
// ═══════════════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  try {
    let body = {};
    try {
      body = await req.json();
    } catch (_) {
      // No body = product request (GET style)
    }

    // ── ROUTE: If table_id exists → Session Command for .exe ──────────
    if (body.table_id) {
      return await handleSessionCommand(body.table_id);
    }

    // ── ROUTE: Default → Product Updates for Kiosk ────────────────────
    return await handleProductUpdates();

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});


// ═══════════════════════════════════════════════════════════════════════
//  HANDLER 1: Product Updates (original getProductUpdates logic)
// ═══════════════════════════════════════════════════════════════════════
async function handleProductUpdates() {
  const products = await db.asServiceRole.entities.Product.list('-updated_date', 200);

  const activeProducts = products.filter(p => p.in_stock !== false);

  const lastUpdated = products.length > 0
    ? products.reduce((latest, p) => {
        const d = new Date(p.updated_date || p.created_date);
        return d > latest ? d : latest;
      }, new Date(0))
    : new Date();

  const version = `${products.length}_${lastUpdated.getTime()}`;

  return Response.json({
    success: true,
    products: activeProducts,
    total: products.length,
    last_updated: lastUpdated.toISOString(),
    version,
  });
}


// ═══════════════════════════════════════════════════════════════════════
//  HANDLER 2: Session Command (for Python .exe client)
//  Client desktop app polls this every 3 seconds
//  Returns: command (LOCK/UNLOCK), session info, orders
// ═══════════════════════════════════════════════════════════════════════
async function handleSessionCommand(table_id: string) {

  // ── 1. Find the GameTable by code ──────────────────────────────────
  const tables = await db.asServiceRole.entities.GameTable.filter({ code: table_id });

  if (!tables || tables.length === 0) {
    // Fallback: try searching by name
    const byName = await db.asServiceRole.entities.GameTable.filter({ name: table_id });
    if (!byName || byName.length === 0) {
      return Response.json({
        error: `Masa tapılmadı: ${table_id}`,
        command: 'LOCK',
        table_status: 'not_found',
        session: null,
        orders: [],
        orders_total: 0,
        timestamp: new Date().toISOString()
      });
    }
    tables.push(byName[0]);
  }

  const table = tables[0];

  // ── 2. Determine command based on table status ─────────────────────
  const isOccupied = table.status === 'occupied';
  const command = isOccupied ? 'UNLOCK' : 'LOCK';

  // ── 3. If no active session, return LOCK immediately ───────────────
  if (!isOccupied || !table.current_session_id) {
    return Response.json({
      success: true,
      command: 'LOCK',
      table_status: table.status || 'available',
      table_name: table.name,
      table_code: table.code,
      category: table.category,
      hourly_rate: table.hourly_rate,
      session: null,
      orders: [],
      orders_total: 0,
      timestamp: new Date().toISOString()
    });
  }

  // ── 4. Fetch the active session ────────────────────────────────────
  let session = null;
  try {
    session = await db.asServiceRole.entities.Session.get(table.current_session_id);
  } catch (_) {
    // Session might have been deleted
  }

  if (!session || (session.status !== 'active' && session.status !== 'paused')) {
    return Response.json({
      success: true,
      command: 'LOCK',
      table_status: table.status,
      table_name: table.name,
      table_code: table.code,
      category: table.category,
      hourly_rate: table.hourly_rate,
      session: null,
      orders: [],
      orders_total: 0,
      timestamp: new Date().toISOString()
    });
  }

  // ── 5. Calculate remaining time ────────────────────────────────────
  const now = new Date();
  let remainingSeconds = null;

  if (!session.is_unlimited && session.end_time) {
    remainingSeconds = Math.max(0, Math.floor((new Date(session.end_time).getTime() - now.getTime()) / 1000));
  }

  // If time is up, return LOCK
  if (remainingSeconds !== null && remainingSeconds <= 0 && !session.is_unlimited) {
    return Response.json({
      success: true,
      command: 'LOCK',
      table_status: 'time_expired',
      table_name: table.name,
      table_code: table.code,
      category: table.category,
      hourly_rate: table.hourly_rate,
      session: {
        id: session.id,
        start_time: session.start_time,
        end_time: session.end_time,
        remaining_seconds: 0,
        is_unlimited: false,
        is_paused: session.status === 'paused',
        customer_name: session.customer_name || '',
        customer_phone: session.customer_phone || '',
        hourly_rate: session.hourly_rate,
        session_cost: session.session_cost || 0,
        orders_cost: session.orders_cost || 0,
        total_cost: session.total_cost || 0,
        duration_minutes: session.duration_minutes || 0,
      },
      orders: [],
      orders_total: 0,
      timestamp: now.toISOString()
    });
  }

  // ── 6. Calculate elapsed time for unlimited sessions ───────────────
  let elapsedSeconds = null;
  if (session.is_unlimited) {
    const totalMs = now.getTime() - new Date(session.start_time).getTime();
    const pausedMs = (session.total_paused_minutes || 0) * 60000;
    elapsedSeconds = Math.max(0, Math.floor((totalMs - pausedMs) / 1000));
  }

  // ── 7. Fetch orders for this session ───────────────────────────────
  let orders = [];
  let ordersTotal = 0;
  try {
    const allOrders = await db.asServiceRole.entities.Order.filter({
      session_id: session.id
    });
    orders = allOrders.map(o => ({
      id: o.id,
      items: (o.items || []).map(item => ({
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),
      total_amount: o.total_amount || 0,
      status: o.status,
      created_date: o.created_date,
    }));
    ordersTotal = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  } catch (_) {
    // Non-critical
  }

  // ── 8. Build and return the full response ──────────────────────────
  return Response.json({
    success: true,
    command: command,
    table_status: table.status,
    table_name: table.name,
    table_code: table.code,
    category: table.category,
    hourly_rate: table.hourly_rate,
    session: {
      id: session.id,
      start_time: session.start_time,
      end_time: session.end_time || null,
      remaining_seconds: remainingSeconds,
      elapsed_seconds: elapsedSeconds,
      is_unlimited: session.is_unlimited || false,
      is_paused: session.status === 'paused',
      customer_name: session.customer_name || '',
      customer_phone: session.customer_phone || '',
      hourly_rate: session.hourly_rate,
      session_cost: session.session_cost || 0,
      orders_cost: session.orders_cost || 0,
      total_cost: session.total_cost || 0,
      duration_minutes: session.duration_minutes || 0,
      total_paused_minutes: session.total_paused_minutes || 0,
    },
    orders: orders,
    orders_total: ordersTotal,
    timestamp: now.toISOString()
  });
}