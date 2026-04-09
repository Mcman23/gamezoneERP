import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { roundCost, calcUnlimitedCost } from '@/lib/tableConfig';

function getBillingElapsedMinutes(session) {
  // For unlimited sessions: raw elapsed minus all paused time
  const totalMs = new Date() - new Date(session.start_time);
  const pausedMs = (session.total_paused_minutes || 0) * 60000;
  // If currently paused, also subtract current pause duration
  const currentPauseMs = (session.status === 'paused' && session.pause_start)
    ? new Date() - new Date(session.pause_start)
    : 0;
  return Math.max(0, Math.floor((totalMs - pausedMs - currentPauseMs) / 60000));
}

export function useTableActions(queryClient, sessionMap, clubOwnerId) {
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tables', clubOwnerId] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions', clubOwnerId] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions-notify', clubOwnerId] });
    // Also invalidate without key suffix for safety
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
  };

  const upsertCustomer = async (phone, name, totalCost) => {
    if (!phone) return;
    try {
      const existing = await base44.entities.Customer.filter({ phone, club_owner_id: clubOwnerId });
      if (existing.length > 0) {
        const c = existing[0];
        await base44.entities.Customer.update(c.id, {
          total_sessions: (c.total_sessions || 0) + 1,
          total_spent: roundCost((c.total_spent || 0) + totalCost),
          last_visit: new Date().toISOString(),
          ...(name && !c.name ? { name } : {}),
        });
      } else {
        await base44.entities.Customer.create({
          phone, name: name || '', total_sessions: 1,
          total_spent: totalCost, last_visit: new Date().toISOString(),
          club_owner_id: clubOwnerId,
        });
      }
    } catch {}
  };

  const startSession = async (table, durationMinutes, hourlyRateOverride = null, customerPhone = null, customerName = null) => {
    if (['locked', 'offline', 'maintenance', 'occupied'].includes(table.status)) {
      toast.error('Bu masa sessiya üçün uygun deyil');
      return;
    }
    const now = new Date();
    const isUnlimited = durationMinutes === null;
    const endTime = isUnlimited ? null : new Date(now.getTime() + durationMinutes * 60000);
    const rate = hourlyRateOverride ?? table.hourly_rate;
    const sessionCost = isUnlimited ? 0 : roundCost((durationMinutes / 60) * rate);

    const session = await base44.entities.Session.create({
      table_id: table.id, table_name: table.name, table_category: table.category,
      start_time: now.toISOString(),
      end_time: isUnlimited ? null : endTime.toISOString(),
      duration_minutes: isUnlimited ? 0 : durationMinutes,
      hourly_rate: rate,
      session_cost: sessionCost, orders_cost: 0, total_cost: sessionCost,
      status: 'active', paid: false, is_unlimited: isUnlimited,
      club_owner_id: clubOwnerId,
      ...(customerPhone ? { customer_phone: customerPhone, customer_name: customerName || '' } : {}),
    });

    await base44.entities.GameTable.update(table.id, { status: 'occupied', current_session_id: session.id });
    invalidate();
    toast.success(`${table.name} açıldı — ${isUnlimited ? 'Limitsiz' : durationMinutes + ' dəq'}`);
  };

  const pauseSession = async (table, session) => {
    if (session.status !== 'active') return;
    await base44.entities.Session.update(session.id, {
      status: 'paused',
      pause_start: new Date().toISOString(),
    });
    invalidate();
    toast.success(`${table.name} fasilə verildi`);
  };

  const resumeSession = async (table, session) => {
    if (session.status !== 'paused' || !session.pause_start) return;
    const pausedMs = new Date() - new Date(session.pause_start);
    const pausedMinutes = Math.floor(pausedMs / 60000);
    const newTotalPaused = (session.total_paused_minutes || 0) + pausedMinutes;
    // Push end_time forward by the pause duration (for non-unlimited sessions)
    const newEndTime = session.end_time
      ? new Date(new Date(session.end_time).getTime() + pausedMs).toISOString()
      : null;
    await base44.entities.Session.update(session.id, {
      status: 'active',
      pause_start: null,
      total_paused_minutes: newTotalPaused,
      ...(newEndTime ? { end_time: newEndTime } : {}),
    });
    invalidate();
    toast.success(`${table.name} davam etdirildi`);
  };

  const stopSession = async (table, session, paymentMethod = 'cash', billingMinutes = null, amountPaid = null) => {
    const isUnlimited = session.is_unlimited;
    const actualBilling = billingMinutes ?? (isUnlimited ? getBillingElapsedMinutes(session) : null);
    const actualCost = isUnlimited ? calcUnlimitedCost(actualBilling, session.hourly_rate) : (session.session_cost || 0);
    const totalCost = roundCost(actualCost + (session.orders_cost || 0));

    await base44.entities.Session.update(session.id, {
      status: 'completed',
      duration_minutes: isUnlimited ? (actualBilling || 0) : session.duration_minutes,
      session_cost: actualCost, total_cost: totalCost,
      paid: true, payment_method: paymentMethod,
      pause_start: null,
    });
    await base44.entities.GameTable.update(table.id, { status: 'available', current_session_id: '' });
    // Auto-upsert customer record
    await upsertCustomer(session.customer_phone, session.customer_name, totalCost);
    invalidate();
    const change = amountPaid && amountPaid > totalCost ? ` | Qaytarılacaq: ${roundCost(amountPaid - totalCost)} ₼` : '';
    toast.success(`${table.name} bağlandı — ${totalCost.toFixed(2)} ₼${change}`);
  };

  const extendSession = async (table, session, extraMinutes) => {
    const newEnd = new Date(new Date(session.end_time).getTime() + extraMinutes * 60000);
    const extraCost = roundCost((extraMinutes / 60) * table.hourly_rate);
    const newSessionCost = roundCost((session.session_cost || 0) + extraCost);
    const newDuration = (session.duration_minutes || 0) + extraMinutes;

    await base44.entities.Session.update(session.id, {
      end_time: newEnd.toISOString(), duration_minutes: newDuration,
      session_cost: newSessionCost, total_cost: roundCost(newSessionCost + (session.orders_cost || 0)),
    });
    invalidate();
    toast.success(`${table.name} +${extraMinutes} dəq uzadıldı`);
  };

  const addOrder = async (table, session, items, totalAmount) => {
    await base44.entities.Order.create({
      session_id: session.id, table_id: table.id, table_name: table.name,
      items, total_amount: totalAmount, status: 'delivered',
      club_owner_id: clubOwnerId,
    });
    const newOrdersCost = roundCost((session.orders_cost || 0) + totalAmount);
    await base44.entities.Session.update(session.id, {
      orders_cost: newOrdersCost, total_cost: roundCost((session.session_cost || 0) + newOrdersCost),
    });
    // Deduct stock
    await Promise.all(items.map(async (item) => {
      const products = await base44.entities.Product.filter({ id: item.product_id });
      if (products.length > 0) {
        const p = products[0];
        const newQty = Math.max(0, (p.stock_quantity ?? 0) - item.quantity);
        await base44.entities.Product.update(p.id, { stock_quantity: newQty, in_stock: newQty > 0 });
      }
    }));
    invalidate();
    toast.success(`${table.name} sifarişi — ${totalAmount.toFixed(2)} ₼`);
  };

  const moveSession = async (sourceTable, targetTable) => {
    const session = sessionMap[sourceTable.id];
    if (!session) return;
    await base44.entities.Session.update(session.id, { table_id: targetTable.id, table_name: targetTable.name });
    await base44.entities.GameTable.update(sourceTable.id, { status: 'available', current_session_id: '' });
    await base44.entities.GameTable.update(targetTable.id, { status: 'occupied', current_session_id: session.id });
    invalidate();
    toast.success(`${sourceTable.name} → ${targetTable.name} köçürüldü`);
  };

  const mergeSession = async (sourceTable, targetTable, targetSession) => {
    const sourceSession = sessionMap[sourceTable.id];
    if (!sourceSession) return;
    const mergedOrders = roundCost((targetSession.orders_cost || 0) + (sourceSession.orders_cost || 0));
    const mergedSession = roundCost((targetSession.session_cost || 0) + (sourceSession.session_cost || 0));
    await base44.entities.Session.update(targetSession.id, {
      orders_cost: mergedOrders, session_cost: mergedSession, total_cost: roundCost(mergedOrders + mergedSession),
    });
    await base44.entities.Session.update(sourceSession.id, { status: 'completed', paid: true });
    await base44.entities.GameTable.update(sourceTable.id, { status: 'available', current_session_id: '' });
    invalidate();
    toast.success(`${sourceTable.name} → ${targetTable.name} birləşdirildi`);
  };

  return { startSession, stopSession, pauseSession, resumeSession, extendSession, addOrder, moveSession, mergeSession };
}