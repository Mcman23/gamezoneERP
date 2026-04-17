import React, { useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext, Link } from 'react-router-dom';
import { useClub, fetchClubEntities } from '@/hooks/useClub';
import { Card } from '@/components/ui/card';
import { Monitor, Clock, DollarSign, ShoppingCart, TrendingUp, Activity } from 'lucide-react';
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';

export default function Dashboard() {
  const { user } = useOutletContext();
  const { clubOwnerId } = useClub(user);
  const queryClient = useQueryClient();

  // Real-time subscriptions
  useEffect(() => {
    if (!clubOwnerId) return;
    const unsubs = [
      base44.entities.Session.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['active-sessions', clubOwnerId] });
        queryClient.invalidateQueries({ queryKey: ['completed-sessions-dash', clubOwnerId] });
      }),
      base44.entities.GameTable.subscribe(() => {
        queryClient.invalidateQueries({ queryKey: ['tables', clubOwnerId] });
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, [clubOwnerId, queryClient]);

  const todayInterval = useMemo(() => {
    const now = new Date();
    return { start: startOfDay(now), end: endOfDay(now) };
  }, []);

  const { data: tables = [] } = useQuery({ queryKey: ['tables', clubOwnerId], queryFn: () => user ? fetchClubEntities(base44.entities.GameTable, user) : [], enabled: !!user });
  const { data: activeSessions = [] } = useQuery({ queryKey: ['active-sessions', clubOwnerId], queryFn: () => user ? fetchClubEntities(base44.entities.Session, user, { status: 'active' }) : [], refetchInterval: 15000, enabled: !!user });
  const { data: completedSessions = [] } = useQuery({ queryKey: ['completed-sessions-dash', clubOwnerId], queryFn: () => user ? fetchClubEntities(base44.entities.Session, user, { status: 'completed' }, '-created_date', 200) : [], enabled: !!user });
  const { data: orders = [] } = useQuery({ queryKey: ['orders-dash', clubOwnerId], queryFn: () => user ? fetchClubEntities(base44.entities.Order, user, {}, '-created_date', 200) : [], enabled: !!user });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses-dash', clubOwnerId], queryFn: () => user ? fetchClubEntities(base44.entities.Expense, user, {}, '-created_date', 200) : [], enabled: !!user });

  const todaySessions = completedSessions.filter(s => { try { return isWithinInterval(new Date(s.created_date), todayInterval); } catch { return false; } });
  const todayOrders = orders.filter(o => { try { return isWithinInterval(new Date(o.created_date), todayInterval); } catch { return false; } });
  const todayExpenses = expenses.filter(e => { try { return isWithinInterval(new Date(e.date || e.created_date), todayInterval); } catch { return false; } });

  const sessionRevenue = todaySessions.reduce((a, s) => a + (s.total_cost || 0), 0);
  const orderRevenue = todayOrders.reduce((a, o) => a + (o.total_amount || 0), 0);
  const totalRevenue = sessionRevenue + orderRevenue;
  const totalExpenses = todayExpenses.reduce((a, e) => a + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const occupied = tables.filter(t => t.status === 'occupied').length;

  const stats = [
    { label: 'Günlük Gəlir', value: `${totalRevenue.toFixed(2)} ₼`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Aktiv Sessiyalar', value: activeSessions.length, icon: Activity, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Masalar', value: `${occupied}/${tables.length}`, icon: Monitor, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Satış Gəliri', value: `${orderRevenue.toFixed(2)} ₼`, icon: ShoppingCart, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Xərclər', value: `${totalExpenses.toFixed(2)} ₼`, icon: TrendingUp, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: 'Xalis Mənfəət', value: `${netProfit.toFixed(2)} ₼`, icon: DollarSign, color: netProfit >= 0 ? 'text-green-500' : 'text-destructive', bg: netProfit >= 0 ? 'bg-green-500/10' : 'bg-destructive/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">İdarə Paneli</h1>
        <p className="text-sm text-muted-foreground mt-1">Salam, {user?.full_name || 'İstifadəçi'}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(stat => (
          <Card key={stat.label} className="p-4 border-border hover:border-primary/20 transition-colors">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Active sessions quick view */}
      {activeSessions.length > 0 && (
        <Card className="border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Aktiv Sessiyalar</h3>
            <Link to="/tables" className="text-xs text-primary hover:underline">Hamısını gör →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeSessions.slice(0, 6).map(session => (
              <div key={session.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/20">
                <Monitor className="w-4 h-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{session.table_name}</p>
                  <p className="text-xs text-muted-foreground">{session.is_unlimited ? 'Limitsiz' : `${session.duration_minutes || 0} dəq`}</p>
                </div>
                <p className="text-sm font-bold text-primary">{((session.session_cost || 0) + (session.orders_cost || 0)).toFixed(2)} ₼</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Today's completed */}
      <Card className="border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Bu gün tamamlanan sessiyalar ({todaySessions.length})</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {todaySessions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Hələ tamamlanan sessiya yoxdur</p>}
          {todaySessions.slice(0, 10).map(session => (
            <div key={session.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">{session.table_name}</span>
                <span className="text-xs text-muted-foreground">{session.duration_minutes || 0} dəq</span>
              </div>
              <span className="text-sm font-bold text-foreground">{(session.total_cost || 0).toFixed(2)} ₼</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}