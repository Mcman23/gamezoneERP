const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import { toast } from 'sonner';
import { roundCost, calcUnlimitedCost } from '@/lib/tableConfig';

function getBillingElapsedMinutes(session) {
  const totalMs = new Date() - new Date(session.start_time);
  const pausedMs = (session.total_paused_minutes || 0) * 60000;
  const currentPauseMs =
    session.status === 'paused' && session.pause_start
      ? new Date() - new Date(session.pause_start)
      : 0;
  return Math.max(0, Math.floor((totalMs - pausedMs - currentPauseMs) / 60000));
}

export function useTableActions(queryClient, sessionMap, clubOwnerId) {
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tables', clubOwnerId] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions', clubOwnerId] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions-notify', clubOwnerId] });
    queryClient.invalidateQueries({ queryKey: ['cashier-sessions', clubOwnerId] });
    queryClient.invalidateQueries({ queryKey: ['cashier-orders', clubOwnerId] });
  };

  const upsertCustomer = async (phone, name, totalCost) => {
    if (!phone) return;
    try {
      const existing = await db.entities.Customer.filter({ phone, club_owner_id: clubOwnerId });
      if (existing.length > 0) {
        const c = existing[0];
        await db.entities.Customer.update(c.id, {
          total_sessions: (c.total_sessions || 0) + 1,
          total_spent: roundCost((c.total_spent || 0) + totalCost),
          last_visit: new Date().toISOString(),
          ...(name && !c.name ? { name } : {}),
        });
      } else {
        await db.entities.Customer.create({
          phone, name: name || '',
          total_sessions: 1,
          total_spent: totalCost,
          last_visit: new Date().toISOString(),
          club_owner_id: clubOwnerId,
        });
      }
    } catch (_) {}
  };

  // ── Start session ────────────────────────────────────────────────────────────
  const startSession = async (table, durationMinutes, hourlyRateOverride = null, customerPhone = null, customerName = null) => {
    try {
      // clubOwnerId yoxlamasi
      if (!clubOwnerId) {
        toast.error('Xəta: Hesabınız kluba bağlanmayıb. Admin ilə əlaqə saxlayın.');
        return;
      }

      if (table.status !== 'available') {
        toast.error('Bu masa hal-hazırda mövcud deyil (dolu, kilidli və ya texniki baxım)');
        return;
      }

      const existingSession = sessionMap[table.id];
      if (existingSession) {
        toast.error(`${table.name} üçün artıq aktiv sessiya mövcuddur`);
        return;
      }

      const now = new Date();
      const isUnlimited = durationMinutes === null;
      const endTime = isUnlimited ? null : new Date(now.getTime() + durationMinutes * 60000);
      const rate = hourlyRateOverride ?? table.hourly_rate;
      const sessionCost = isUnlimited ? 0 : roundCost((durationMinutes / 60) * rate);

      const session = await db.entities.Session.create({
        table_id: table.id,
        table_name: table.name,
        table_category: table.category,
        start_time: now.toISOString(),
        end_time: isUnlimited ? null : endTime.toISOString(),
        duration_minutes: isUnlimited ? 0 : durationMinutes,
        hourly_rate: rate,
        session_cost: sessionCost,
        orders_cost: 0,
        total_cost: sessionCost,
        status: 'active',
        paid: false,
        is_unlimited: isUnlimited,
        club_owner_id: clubOwnerId,
        ...(customerPhone ? { customer_phone: customerPhone, customer_name: customerName || '' } : {}),
      });

      await db.entities.GameTable.update(table.id, {
        status: 'occupied',
        current_session_id: session.id,
      });

      invalidate();
      toast.success(`${table.name} açıldı — ${isUnlimited ? 'Limitsiz' : durationMinutes + ' dəq'}`);
    } catch (error) {
      console.error('startSession error:', error);
      toast.error(`Xəta: ${error?.message || JSON.stringify(error)}`);
    }
  };

  // ── Pause session ────────────────────────────────────────────────────────────
  const pauseSession = async (table, session) => {
    try {
      if (session.status !== 'active') { toast.error('Yalnız aktiv sessiya dayandırıla bilər'); return; }
      await db.entities.Session.update(session.id, { status: 'paused', pause_start: new Date().toISOString() });
      invalidate();
      toast.success(`${table.name} fasilə verildi`);
    } catch(e) { toast.error(`Xəta: ${e?.message}`); }
  };

  // ── Resume session ───────────────────────────────────────────────────────────
  const resumeSession = async (table, session) => {
    try {
      if (session.status !== 'paused' || !session.pause_start) { toast.error('Yalnız dayandırılmış sessiya davam etdirilə bilər'); return; }
      const pausedMs = new Date() - new Date(session.pause_start);
      const pausedMinutes = Math.floor(pausedMs / 60000);
      const newTotalPaused = (session.total_paused_minutes || 0) + pausedMinutes;
      const newEndTime = session.end_time ? new Date(new Date(session.end_time).getTime() + pausedMs).toISOString() : null;
      await db.entities.Session.update(session.id, {
        status: 'active', pause_start: null, total_paused_minutes: newTotalPaused,
        ...(newEndTime ? { end_time: newEndTime } : {}),
      });
      invalidate();
      toast.success(`${table.name} davam etdirildi`);
    } catch(e) { toast.error(`Xəta: ${e?.message}`); }
  };

  // ── Stop session ─────────────────────────────────────────────────────────────
  const stopSession = async (table, session, paymentMethod = 'cash', billingMinutes = null, amountPaid = null) => {
    try {
      if (!session) { toast.error('Sessiya tapılmadı'); return; }

      const isUnlimited = session.is_unlimited;
      const actualBilling = billingMinutes ?? (isUnlimited ? getBillingElapsedMinutes(session) : null);
      const actualCost = isUnlimited ? calcUnlimitedCost(actualBilling, session.hourly_rate) : session.session_cost || 0;
      const totalCost = roundCost(actualCost + (session.orders_cost || 0));

      await db.entities.Session.update(session.id, {
        status: 'completed',
        end_time: new Date().toISOString(),
        duration_minutes: isUnlimited ? actualBilling || 0 : session.duration_minutes,
        session_cost: actualCost,
        total_cost: totalCost,
        paid: true,
        payment_method: paymentMethod,
        pause_start: null,
      });

      await db.entities.GameTable.update(table.id, {
        status: 'available',
        current_session_id: '',
      });

      upsertCustomer(session.customer_phone, session.customer_name, totalCost);
      invalidate();

      const change = amountPaid && amountPaid > totalCost
        ? ` | Qaytarılacaq: ${roundCost(amountPaid - totalCost)} ₼` : '';
      toast.success(`${table.name} bağlandı — ${totalCost.toFixed(2)} ₼${change}`);
    } catch (error) {
      console.error('stopSession error:', error);
      toast.error(`Xəta: ${error?.message || JSON.stringify(error)}`);
    }
  };

  // ── Extend session ───────────────────────────────────────────────────────────
  const extendSession = async (table, session, extraMinutes) => {
    try {
      if (!session || session.is_unlimited) { toast.error('Limitsiz sessiya uzadıla bilməz'); return; }
      const newEnd = new Date(new Date(session.end_time).getTime() + extraMinutes * 60000);
      const extraCost = roundCost((extraMinutes / 60) * table.hourly_rate);
      const newSessionCost = roundCost((session.session_cost || 0) + extraCost);
      const newDuration = (session.duration_minutes || 0) + extraMinutes;
      await db.entities.Session.update(session.id, {
        end_time: newEnd.toISOString(),
        duration_minutes: newDuration,
        session_cost: newSessionCost,
        total_cost: roundCost(newSessionCost + (session.orders_cost || 0)),
      });
      invalidate();
      toast.success(`${table.name} +${extraMinutes} dəq uzadıldı`);
    } catch(e) { toast.error(`Xəta: ${e?.message}`); }
  };

  // ── Add order ────────────────────────────────────────────────────────────────
  const addOrder = async (table, session, items, totalAmount) => {
    try {
      if (!session) { toast.error('Aktiv sessiya tapılmadı'); return; }

      await db.entities.Order.create({
        session_id: session.id, table_id: table.id, table_name: table.name,
        items, total_amount: totalAmount, status: 'pending', club_owner_id: clubOwnerId,
      });

      const newOrdersCost = roundCost((session.orders_cost || 0) + totalAmount);
      await db.entities.Session.update(session.id, {
        orders_cost: newOrdersCost,
        total_cost: roundCost((session.session_cost || 0) + newOrdersCost),
      });

      await Promise.all(items.map(async item => {
        try {
          const [product] = await db.entities.Product.filter({ id: item.product_id });
          if (!product) return;
          const newQty = Math.max(0, (product.stock_quantity ?? 0) - item.quantity);
          await db.entities.Product.update(product.id, { stock_quantity: newQty, in_stock: newQty > 0 });
          const threshold = product.low_stock_threshold ?? 5;
          if (newQty === 0) toast.error(`⚠️ ${product.name} stokda bitti!`, { duration: 6000 });
          else if (newQty <= threshold) toast.warning(`⚠️ ${product.name} az qaldı — ${newQty} ədəd`, { duration: 5000 });
        } catch(_) {}
      }));

      invalidate();
      queryClient.invalidateQueries({ queryKey: ['products-stock', clubOwnerId] });
      toast.success(`${table.name} sifarişi — ${totalAmount.toFixed(2)} ₼`);
    } catch(e) { toast.error(`Xəta: ${e?.message}`); }
  };

  // ── Move session ─────────────────────────────────────────────────────────────
  const moveSession = async (sourceTable, targetTable) => {
    try {
      const session = sessionMap[sourceTable.id];
      if (!session) { toast.error('Köçürüləcək sessiya tapılmadı'); return; }
      if (targetTable.status !== 'available') { toast.error(`${targetTable.name} boş deyil`); return; }
      await db.entities.Session.update(session.id, { table_id: targetTable.id, table_name: targetTable.name });
      await db.entities.GameTable.update(sourceTable.id, { status: 'available', current_session_id: '' });
      await db.entities.GameTable.update(targetTable.id, { status: 'occupied', current_session_id: session.id });
      invalidate();
      toast.success(`${sourceTable.name} → ${targetTable.name} köçürüldü`);
    } catch(e) { toast.error(`Xəta: ${e?.message}`); }
  };

  // ── Merge session ─────────────────────────────────────────────────────────────
  const mergeSession = async (sourceTable, targetTable, targetSession) => {
    try {
      const sourceSession = sessionMap[sourceTable.id];
      if (!sourceSession) { toast.error('Birləşdiriləcək sessiya tapılmadı'); return; }
      const mergedOrders  = roundCost((targetSession.orders_cost  || 0) + (sourceSession.orders_cost  || 0));
      const mergedSession = roundCost((targetSession.session_cost || 0) + (sourceSession.session_cost || 0));
      await Promise.all([
        db.entities.Session.update(targetSession.id, { orders_cost: mergedOrders, session_cost: mergedSession, total_cost: roundCost(mergedOrders + mergedSession) }),
        db.entities.Session.update(sourceSession.id, { status: 'completed', paid: true, end_time: new Date().toISOString() }),
        db.entities.GameTable.update(sourceTable.id, { status: 'available', current_session_id: '' }),
      ]);
      invalidate();
      toast.success(`${sourceTable.name} → ${targetTable.name} birləşdirildi`);
    } catch(e) { toast.error(`Xəta: ${e?.message}`); }
  };

  return { startSession, stopSession, pauseSession, resumeSession, extendSession, addOrder, moveSession, mergeSession };
}
