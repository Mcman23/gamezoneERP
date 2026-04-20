const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let table_id = null;
    try {
      const body = await req.json();
      if (body && body.table_id) {
        table_id = body.table_id;
      }
    } catch (e) {
      // No JSON body — this is a product request
    }

    // If table_id provided → Session Command for .exe client
    if (table_id) {
      // 1. Find the GameTable by code
      let tables = await db.asServiceRole.entities.GameTable.filter({ code: table_id });

      if (!tables || tables.length === 0) {
        const byName = await db.asServiceRole.entities.GameTable.filter({ name: table_id });
        if (!byName || byName.length === 0) {
          return Response.json({
            success: false,
            error: 'Masa tapilmadi: ' + table_id,
            command: 'LOCK',
            table_status: 'not_found',
            session: null,
            orders: [],
            orders_total: 0,
            timestamp: new Date().toISOString()
          });
        }
        tables = byName;
      }

      const table = tables[0];
      const isOccupied = table.status === 'occupied';

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

      let session = null;
      try {
        session = await db.asServiceRole.entities.Session.get(table.current_session_id);
      } catch (e2) {
        // Session might have been deleted
      }

      if (!session || (session.status !== 'active' && session.status !== 'paused')) {
        return Response.json({
          success: true,
          command: 'LOCK',
          table_status: table.status,
          table_name: table.name,
          table_code: table.code,
          session: null,
          orders: [],
          orders_total: 0,
          timestamp: new Date().toISOString()
        });
      }

      const now = new Date();
      let remainingSeconds = null;
      let elapsedSeconds = null;

      if (!session.is_unlimited && session.end_time) {
        const endMs = new Date(session.end_time).getTime();
        const nowMs = now.getTime();
        remainingSeconds = Math.max(0, Math.floor((endMs - nowMs) / 1000));
      }

      if (remainingSeconds !== null && remainingSeconds <= 0 && !session.is_unlimited) {
        return Response.json({
          success: true,
          command: 'LOCK',
          table_status: 'time_expired',
          table_name: table.name,
          table_code: table.code,
          session: {
            id: session.id,
            start_time: session.start_time,
            end_time: session.end_time,
            remaining_seconds: 0,
            is_unlimited: false,
            is_paused: session.status === 'paused',
            session_cost: session.session_cost || 0,
            orders_cost: session.orders_cost || 0,
            total_cost: session.total_cost || 0,
            duration_minutes: session.duration_minutes || 0
          },
          orders: [],
          orders_total: 0,
          timestamp: now.toISOString()
        });
      }

      if (session.is_unlimited) {
        const totalMs = now.getTime() - new Date(session.start_time).getTime();
        const pausedMs = (session.total_paused_minutes || 0) * 60000;
        elapsedSeconds = Math.max(0, Math.floor((totalMs - pausedMs) / 1000));
      }

      let orders = [];
      let ordersTotal = 0;
      try {
        const allOrders = await db.asServiceRole.entities.Order.filter({ session_id: session.id });
        orders = allOrders.map(function(o) {
          return {
            id: o.id,
            items: (o.items || []).map(function(item) {
              return {
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price
              };
            }),
            total_amount: o.total_amount || 0,
            status: o.status,
            created_date: o.created_date
          };
        });
        ordersTotal = orders.reduce(function(sum, o) { return sum + (o.total_amount || 0); }, 0);
      } catch (e3) {
        // Non-critical
      }

      return Response.json({
        success: true,
        command: isOccupied ? 'UNLOCK' : 'LOCK',
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
          hourly_rate: session.hourly_rate,
          session_cost: session.session_cost || 0,
          orders_cost: session.orders_cost || 0,
          total_cost: session.total_cost || 0,
          duration_minutes: session.duration_minutes || 0,
          total_paused_minutes: session.total_paused_minutes || 0
        },
        orders: orders,
        orders_total: ordersTotal,
        timestamp: now.toISOString()
      });
    }

    // No table_id → return Product Updates for Kiosk
    const products = await db.asServiceRole.entities.Product.list('-updated_date', 200);
    const activeProducts = products.filter(function(p) { return p.in_stock !== false; });

    const lastUpdated = products.length > 0
      ? products.reduce(function(latest, p) {
          const d = new Date(p.updated_date || p.created_date);
          return d > latest ? d : latest;
        }, new Date(0))
      : new Date();

    const version = products.length + '_' + lastUpdated.getTime();

    return Response.json({
      success: true,
      products: activeProducts,
      total: products.length,
      last_updated: lastUpdated.toISOString(),
      version: version
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});