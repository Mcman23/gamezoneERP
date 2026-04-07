import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Monitor, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';
import TableCard from '../components/dashboard/TableCard';
import StartSessionDialog from '../components/dashboard/StartSessionDialog';
import StopSessionDialog from '../components/dashboard/StopSessionDialog';
import ExtendSessionDialog from '../components/dashboard/ExtendSessionDialog';
import OrderDialog from '../components/dashboard/OrderDialog';
import RemoteControlDialog from '../components/dashboard/RemoteControlDialog';
import MoveTableDialog from '../components/dashboard/MoveTableDialog';
import MergeTableDialog from '../components/dashboard/MergeTableDialog';
import DashboardStats from '../components/dashboard/DashboardStats';

export default function Dashboard() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();

  const [startDialog, setStartDialog] = useState({ open: false, table: null });
  const [stopDialog, setStopDialog] = useState({ open: false, table: null, session: null });
  const [extendDialog, setExtendDialog] = useState({ open: false, table: null, session: null });
  const [orderDialog, setOrderDialog] = useState({ open: false, table: null, session: null });
  const [remoteDialog, setRemoteDialog] = useState({ open: false, table: null });
  const [moveDialog, setMoveDialog] = useState({ open: false, table: null });
  const [mergeDialog, setMergeDialog] = useState({ open: false, table: null });
  const [filterType, setFilterType] = useState('all');

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => base44.entities.GameTable.list('order_number'),
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: () => base44.entities.Session.filter({ status: 'active' }),
    refetchInterval: 15000,
  });

  const sessionMap = {};
  activeSessions.forEach(s => { sessionMap[s.table_id] = s; });

  const filteredTables = filterType === 'all' ? tables : tables.filter(t => t.type === filterType);

  const startSession = async (table, durationMinutes) => {
    const now = new Date();
    const isUnlimited = durationMinutes === null;
    const endTime = isUnlimited ? null : new Date(now.getTime() + durationMinutes * 60000);
    const sessionCost = isUnlimited ? 0 : (durationMinutes / 60) * table.hourly_rate;

    const session = await base44.entities.Session.create({
      table_id: table.id,
      table_name: table.name,
      start_time: now.toISOString(),
      end_time: isUnlimited ? null : endTime.toISOString(),
      duration_minutes: isUnlimited ? 0 : durationMinutes,
      hourly_rate: table.hourly_rate,
      session_cost: parseFloat(sessionCost.toFixed(2)),
      orders_cost: 0,
      total_cost: parseFloat(sessionCost.toFixed(2)),
      status: 'active',
      paid: false,
      is_unlimited: isUnlimited,
    });

    await base44.entities.GameTable.update(table.id, { status: 'occupied', current_session_id: session.id });
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions-notify'] });
    toast.success(`${table.name} açıldı — ${isUnlimited ? 'Limitsiz' : durationMinutes + ' dəqiqə'}`);
  };

  const stopSession = async (table, session, paymentMethod = 'cash', elapsedMinutes = null) => {
    const isUnlimited = session.is_unlimited;
    const actualSessionCost = isUnlimited
      ? parseFloat(((elapsedMinutes / 60) * session.hourly_rate).toFixed(2))
      : (session.session_cost || 0);
    const totalCost = actualSessionCost + (session.orders_cost || 0);

    await base44.entities.Session.update(session.id, {
      status: 'completed',
      duration_minutes: isUnlimited ? elapsedMinutes : session.duration_minutes,
      session_cost: actualSessionCost,
      total_cost: parseFloat(totalCost.toFixed(2)),
      paid: true,
      payment_method: paymentMethod,
    });
    await base44.entities.GameTable.update(table.id, { status: 'available', current_session_id: '' });
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions-notify'] });
    const methodLabel = paymentMethod === 'card' ? 'Kart' : 'Nağd';
    toast.success(`${table.name} bağlandı — ${totalCost.toFixed(2)} ₼ (${methodLabel})`);
  };

  const extendSession = async (table, session, extraMinutes) => {
    const newEnd = new Date(new Date(session.end_time).getTime() + extraMinutes * 60000);
    const extraCost = (extraMinutes / 60) * table.hourly_rate;
    const newSessionCost = (session.session_cost || 0) + extraCost;
    const newDuration = (session.duration_minutes || 0) + extraMinutes;

    await base44.entities.Session.update(session.id, {
      end_time: newEnd.toISOString(),
      duration_minutes: newDuration,
      session_cost: parseFloat(newSessionCost.toFixed(2)),
      total_cost: parseFloat((newSessionCost + (session.orders_cost || 0)).toFixed(2)),
    });
    queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions-notify'] });
    toast.success(`${table.name} vaxtı ${extraMinutes} dəq uzadıldı`);
  };

  const addOrder = async (table, session, items, totalAmount) => {
    await base44.entities.Order.create({
      session_id: session.id,
      table_id: table.id,
      table_name: table.name,
      items,
      total_amount: totalAmount,
      status: 'delivered',
    });
    const newOrdersCost = (session.orders_cost || 0) + totalAmount;
    await base44.entities.Session.update(session.id, {
      orders_cost: parseFloat(newOrdersCost.toFixed(2)),
      total_cost: parseFloat(((session.session_cost || 0) + newOrdersCost).toFixed(2)),
    });
    queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    toast.success(`${table.name} sifarişi əlavə edildi — ${totalAmount.toFixed(2)} ₼`);
  };

  const moveSession = async (sourceTable, targetTable) => {
    const session = sessionMap[sourceTable.id];
    if (!session) return;
    await base44.entities.Session.update(session.id, { table_id: targetTable.id, table_name: targetTable.name });
    await base44.entities.GameTable.update(sourceTable.id, { status: 'available', current_session_id: '' });
    await base44.entities.GameTable.update(targetTable.id, { status: 'occupied', current_session_id: session.id });
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    toast.success(`Sessiya ${sourceTable.name} → ${targetTable.name} köçürüldü`);
  };

  const mergeSession = async (sourceTable, targetTable, targetSession) => {
    const sourceSession = sessionMap[sourceTable.id];
    if (!sourceSession) return;
    const mergedOrdersCost = (targetSession.orders_cost || 0) + (sourceSession.orders_cost || 0);
    const mergedSessionCost = (targetSession.session_cost || 0) + (sourceSession.session_cost || 0);
    await base44.entities.Session.update(targetSession.id, {
      orders_cost: mergedOrdersCost,
      session_cost: mergedSessionCost,
      total_cost: mergedOrdersCost + mergedSessionCost,
    });
    await base44.entities.Session.update(sourceSession.id, { status: 'completed', paid: true, payment_method: 'merged' });
    await base44.entities.GameTable.update(sourceTable.id, { status: 'available', current_session_id: '' });
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
    toast.success(`${sourceTable.name} → ${targetTable.name} birləşdirildi`);
  };

  const handleRestart = (table) => setRemoteDialog({ open: true, table });
  const handleShutdown = (table) => setRemoteDialog({ open: true, table });

  if (tablesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">İdarə Paneli</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Salam, {user?.full_name || 'İstifadəçi'} — {user?.role === 'admin' ? 'Yönətici' : 'Kassir'}
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Hamısı', icon: null },
            { key: 'pc', label: 'PC', icon: Monitor },
            { key: 'playstation', label: 'PS', icon: Gamepad2 },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterType(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                filterType === f.key
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.icon && <f.icon className="w-3.5 h-3.5" />}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <DashboardStats tables={tables} activeSessions={activeSessions} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTables.map(table => (
          <TableCard
            key={table.id}
            table={table}
            session={sessionMap[table.id]}
            onStart={(t) => setStartDialog({ open: true, table: t })}
            onStop={(t, s) => setStopDialog({ open: true, table: t, session: s })}
            onRestart={handleRestart}
            onShutdown={handleShutdown}
            onExtend={(t, s) => setExtendDialog({ open: true, table: t, session: s })}
            onOrder={(t, s) => setOrderDialog({ open: true, table: t, session: s })}
            onMove={(t) => setMoveDialog({ open: true, table: t })}
            onMerge={(t) => setMergeDialog({ open: true, table: t })}
          />
        ))}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-16">
          <Monitor className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Masa tapılmadı</p>
          <p className="text-xs text-muted-foreground mt-1">Tənzimləmələr bölməsindən masa əlavə edin</p>
        </div>
      )}

      <StartSessionDialog
        open={startDialog.open}
        onOpenChange={(v) => setStartDialog(s => ({ ...s, open: v }))}
        table={startDialog.table}
        onConfirm={startSession}
      />
      <StopSessionDialog
        open={stopDialog.open}
        onOpenChange={(v) => setStopDialog(s => ({ ...s, open: v }))}
        table={stopDialog.table}
        session={stopDialog.session}
        onConfirm={stopSession}
      />
      <ExtendSessionDialog
        open={extendDialog.open}
        onOpenChange={(v) => setExtendDialog(s => ({ ...s, open: v }))}
        table={extendDialog.table}
        session={extendDialog.session}
        onConfirm={extendSession}
      />
      <OrderDialog
        open={orderDialog.open}
        onOpenChange={(v) => setOrderDialog(s => ({ ...s, open: v }))}
        table={orderDialog.table}
        session={orderDialog.session}
        onConfirm={addOrder}
      />
      <RemoteControlDialog
        open={remoteDialog.open}
        onOpenChange={(v) => setRemoteDialog(s => ({ ...s, open: v }))}
        table={remoteDialog.table}
      />
      <MoveTableDialog
        open={moveDialog.open}
        onOpenChange={(v) => setMoveDialog(s => ({ ...s, open: v }))}
        sourceTable={moveDialog.table}
        tables={tables}
        sessionMap={sessionMap}
        onConfirm={(target) => moveSession(moveDialog.table, target)}
      />
      <MergeTableDialog
        open={mergeDialog.open}
        onOpenChange={(v) => setMergeDialog(s => ({ ...s, open: v }))}
        sourceTable={mergeDialog.table}
        tables={tables}
        sessionMap={sessionMap}
        onConfirm={(target, targetSession) => mergeSession(mergeDialog.table, target, targetSession)}
      />
    </div>
  );
}