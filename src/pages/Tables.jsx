import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Monitor, Gamepad2, Tv2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS } from '@/lib/tableConfig';
import TableCard from '@/components/tables/TableCard';
import StartSessionDialog from '@/components/tables/StartSessionDialog';
import StopSessionDialog from '@/components/tables/StopSessionDialog';
import ExtendSessionDialog from '@/components/tables/ExtendSessionDialog';
import OrderDialog from '@/components/tables/OrderDialog';
import MoveTableDialog from '@/components/tables/MoveTableDialog';
import MergeTableDialog from '@/components/tables/MergeTableDialog';
import RemoteControlDialog from '@/components/tables/RemoteControlDialog';
import { useTableActions } from '@/hooks/useTableActions';
import { useClub, fetchClubEntities } from '@/hooks/useClub';

const catIcons = { computer: Monitor, playstation: Gamepad2, cabinet: Gamepad2, simulator: Tv2 };

export default function Tables() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const { clubOwnerId } = useClub(user);

  const [startDialog, setStartDialog] = useState({ open: false, table: null });
  const [stopDialog, setStopDialog] = useState({ open: false, table: null, session: null });
  const [extendDialog, setExtendDialog] = useState({ open: false, table: null, session: null });
  const [orderDialog, setOrderDialog] = useState({ open: false, table: null, session: null });
  const [moveDialog, setMoveDialog] = useState({ open: false, table: null });
  const [mergeDialog, setMergeDialog] = useState({ open: false, table: null });
  const [remoteDialog, setRemoteDialog] = useState({ open: false, table: null });

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['tables', clubOwnerId] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions', clubOwnerId] });
  };

  // Real-time subscriptions for instant UI updates
  useEffect(() => {
    if (!clubOwnerId) return;
    const unsubTable = base44.entities.GameTable.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['tables', clubOwnerId] });
    });
    const unsubSession = base44.entities.Session.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions', clubOwnerId] });
    });
    return () => { unsubTable(); unsubSession(); };
  }, [clubOwnerId, queryClient]);

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables', clubOwnerId],
    queryFn: () => user ? fetchClubEntities(base44.entities.GameTable, user, {}, 'order_number') : [],
    enabled: !!user,
    refetchInterval: 30000
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['active-sessions', clubOwnerId],
    queryFn: async () => {
      if (!user) return [];
      const all = await fetchClubEntities(base44.entities.Session, user, {}, '-created_date', 100);
      return all.filter((x) => x.status === 'active' || x.status === 'paused');
    },
    enabled: !!user,
    refetchInterval: 15000
  });

  const sessionMap = {};
  activeSessions.forEach((s) => {sessionMap[s.table_id] = s;});

  const actions = useTableActions(queryClient, sessionMap, clubOwnerId);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tables', clubOwnerId] });
    queryClient.invalidateQueries({ queryKey: ['active-sessions', clubOwnerId] });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      activeSessions.forEach(async (session) => {
        if (session.status !== 'active' || session.is_unlimited || !session.end_time) return;
        const secondsLeft = Math.floor((new Date(session.end_time) - now) / 1000);
        if (secondsLeft <= 0) {
          try {
            await base44.entities.Session.update(session.id, {
              status: 'completed',
              end_time: now.toISOString(),
              total_cost: (session.session_cost || 0) + (session.orders_cost || 0),
              paid: false,
            });
            await base44.entities.GameTable.update(session.table_id, {
              status: 'available',
              current_session_id: '',
            });
            toast.warning(`⏰ ${session.table_name} — vaxt bitdi, masa boşaldıldı!`, { duration: 8000 });
            invalidate();
          } catch (e) {
            console.error('Auto-close error:', e);
          }
        } else if (secondsLeft <= 120 && secondsLeft > 115) {
          toast.warning(`⚠️ ${session.table_name} — 2 dəqiqə qaldı!`, { duration: 6000 });
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSessions, clubOwnerId]);

  const grouped = useMemo(() => {
    const groups = {};
    const order = ['computer', 'playstation', 'cabinet', 'simulator'];
    order.forEach((cat) => {groups[cat] = [];});
    tables.forEach((t) => {
      const cat = t.category || 'computer';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    });
    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [tables]);

  const occupied = tables.filter((t) => t.status === 'occupied').length;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!isLoading && tables.length === 0) {
    return (
      <div className="space-y-4">
        <div><h1 className="text-2xl font-bold">Masalar</h1></div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Monitor className="w-14 h-14 text-muted-foreground/20 mb-4" />
          <p className="text-lg font-medium text-foreground mb-1">Hələ heç bir masa əlavə edilməyib</p>
          <p className="text-sm text-muted-foreground mb-4">Masaları idarə etmək üçün Tənzimləmələr bölməsinə keçin</p>
        </div>
      </div>);

  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Masalar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="text-primary font-semibold">{occupied}</span> dolu /
            <span className="ml-1">{tables.length} ümumi</span>
            <span className="ml-2 text-green-500 font-medium">{tables.length - occupied} boş</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Yenilə
        </Button>
      </div>

      {grouped.map(([category, items]) => {
        const Icon = catIcons[category] || Monitor;
        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[hsl(var(--destructive-foreground))] text-base font-extrabold uppercase tracking-wider">{CATEGORY_LABELS[category] || category}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((table) =>
              <TableCard
                key={table.id}
                table={table}
                session={sessionMap[table.id]}
                onStart={(t) => setStartDialog({ open: true, table: t })}
                onStop={(t, s) => setStopDialog({ open: true, table: t, session: s })}
                onExtend={(t, s) => setExtendDialog({ open: true, table: t, session: s })}
                onOrder={(t, s) => setOrderDialog({ open: true, table: t, session: s })}
                onPause={(t, s) => actions.pauseSession(t, s)}
                onResume={(t, s) => actions.resumeSession(t, s)}
                onMove={(t) => setMoveDialog({ open: true, table: t })}
                onMerge={(t) => setMergeDialog({ open: true, table: t })}
                onRemote={(t) => setRemoteDialog({ open: true, table: t })}
                isAdmin={user?.role === 'admin'} />

              )}
            </div>
          </div>);

      })}

      <StartSessionDialog open={startDialog.open} onOpenChange={(v) => setStartDialog((s) => ({ ...s, open: v }))} table={startDialog.table} onConfirm={actions.startSession} />
      <StopSessionDialog open={stopDialog.open} onOpenChange={(v) => setStopDialog((s) => ({ ...s, open: v }))} table={stopDialog.table} session={stopDialog.session} onConfirm={actions.stopSession} />
      <ExtendSessionDialog open={extendDialog.open} onOpenChange={(v) => setExtendDialog((s) => ({ ...s, open: v }))} table={extendDialog.table} session={extendDialog.session} onConfirm={actions.extendSession} />
      <OrderDialog open={orderDialog.open} onOpenChange={(v) => setOrderDialog((s) => ({ ...s, open: v }))} table={orderDialog.table} session={orderDialog.session} onConfirm={actions.addOrder} clubOwnerId={clubOwnerId} />
      <MoveTableDialog open={moveDialog.open} onOpenChange={(v) => setMoveDialog((s) => ({ ...s, open: v }))} sourceTable={moveDialog.table} tables={tables} sessionMap={sessionMap} onConfirm={(target) => actions.moveSession(moveDialog.table, target)} />
      <MergeTableDialog open={mergeDialog.open} onOpenChange={(v) => setMergeDialog((s) => ({ ...s, open: v }))} sourceTable={mergeDialog.table} tables={tables} sessionMap={sessionMap} onConfirm={(target, targetSession) => actions.mergeSession(mergeDialog.table, target, targetSession)} />
      <RemoteControlDialog open={remoteDialog.open} onOpenChange={(v) => setRemoteDialog((s) => ({ ...s, open: v }))} table={remoteDialog.table} isAdmin={user?.role === 'admin'} />
    </div>);

}