import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useClub } from '@/hooks/useClub';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Receipt, Banknote, CreditCard, Monitor, ShoppingCart, Clock, Download } from 'lucide-react';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

function exportCashierReport(data) {
  const rows = [
    ['GÜNLÜK KASSIR HESABATI', format(new Date(), 'dd/MM/yyyy')],
    [''],
    ['Göstərici', 'Dəyər'],
    ['Ümumi gəlir', `${data.totalRevenue.toFixed(2)} AZN`],
    ['Nağd', `${data.cashTotal.toFixed(2)} AZN`],
    ['Kart', `${data.cardTotal.toFixed(2)} AZN`],
    ['Sessiya gəliri', `${data.sessionRevenue.toFixed(2)} AZN`],
    ['Sifariş gəliri', `${data.orderRevenue.toFixed(2)} AZN`],
    ['Sessiya sayı', data.sessionCount],
    [''],
    ['-- SİFARİŞLƏR --'],
    ['Masa', 'Məbləğ', 'Vaxt'],
  ];
  data.orders.forEach(o => {
    rows.push([o.table_name || '', `${(o.total_amount || 0).toFixed(2)} AZN`, o.created_date ? format(new Date(o.created_date), 'HH:mm') : '']);
  });

  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kassir_hesabat_${format(new Date(), 'yyyyMMdd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CashierPanel() {
  const { user } = useOutletContext();
  const { clubOwnerId } = useClub(user);
  const todayInterval = useMemo(() => {
    const now = new Date();
    return { start: startOfDay(now), end: endOfDay(now) };
  }, []);

  const { data: sessions = [] } = useQuery({
    queryKey: ['cashier-sessions', clubOwnerId],
    queryFn: () => clubOwnerId ? base44.entities.Session.filter({ status: 'completed', club_owner_id: clubOwnerId }, '-created_date', 500) : [],
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['active-sessions', clubOwnerId],
    queryFn: () => clubOwnerId ? base44.entities.Session.filter({ status: 'active', club_owner_id: clubOwnerId }) : [],
    refetchInterval: 15000,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['cashier-orders', clubOwnerId],
    queryFn: () => clubOwnerId ? base44.entities.Order.filter({ club_owner_id: clubOwnerId }, '-created_date', 500) : [],
  });

  const todaySessions = useMemo(() => sessions.filter(s => {
    try { return isWithinInterval(new Date(s.created_date), todayInterval); } catch { return false; }
  }), [sessions, todayInterval]);

  const todayOrders = useMemo(() => orders.filter(o => {
    try { return isWithinInterval(new Date(o.created_date), todayInterval); } catch { return false; }
  }), [orders, todayInterval]);

  const cashTotal = todaySessions.filter(s => s.payment_method === 'cash').reduce((a, s) => a + (s.total_cost || 0), 0);
  const cardTotal = todaySessions.filter(s => s.payment_method === 'card').reduce((a, s) => a + (s.total_cost || 0), 0);
  const sessionRevenue = todaySessions.reduce((a, s) => a + (s.session_cost || 0), 0);
  const orderRevenue = todayOrders.reduce((a, o) => a + (o.total_amount || 0), 0);
  const totalRevenue = cashTotal + cardTotal;
  const sessionCount = todaySessions.length;

  const reportData = { totalRevenue, cashTotal, cardTotal, sessionRevenue, orderRevenue, sessionCount, orders: todayOrders };

  const stats = [
    { label: 'Ümumi Gəlir', value: `${totalRevenue.toFixed(2)} ₼`, icon: Receipt, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Nağd', value: `${cashTotal.toFixed(2)} ₼`, icon: Banknote, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Kart', value: `${cardTotal.toFixed(2)} ₼`, icon: CreditCard, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Sessiyalar', value: sessionCount, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Aktiv', value: activeSessions.length, icon: Monitor, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { label: 'Sifarişlər', value: `${orderRevenue.toFixed(2)} ₼`, icon: ShoppingCart, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Kassir Paneli</h1>
          <p className="text-sm text-muted-foreground mt-1">Günlük hesabat — {format(new Date(), 'dd MMMM yyyy')}</p>
        </div>
        <Button variant="outline" onClick={() => exportCashierReport(reportData)} className="gap-2">
          <Download className="w-4 h-4" /> İxrac et
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(stat => (
          <Card key={stat.label} className="p-4 border-border">
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

      {/* Recent sessions */}
      <Card className="border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Bu günkü sessiyalar</h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {todaySessions.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sessiya yoxdur</p>}
          {todaySessions.slice(0, 20).map(session => (
            <div key={session.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-3">
                <Monitor className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{session.table_name}</p>
                  <p className="text-xs text-muted-foreground">{session.duration_minutes || 0} dəq • {session.created_date ? format(new Date(session.created_date), 'HH:mm') : ''}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{(session.total_cost || 0).toFixed(2)} ₼</p>
                <Badge variant="secondary" className="text-[10px]">{session.payment_method === 'card' ? 'Kart' : 'Nağd'}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent orders */}
      <Card className="border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Bu günkü sifarişlər</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {todayOrders.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sifariş yoxdur</p>}
          {todayOrders.slice(0, 15).map(order => (
            <div key={order.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary/50 border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">{order.table_name}</p>
                <p className="text-xs text-muted-foreground">{(order.items || []).map(i => `${i.product_name} x${i.quantity}`).join(', ')}</p>
              </div>
              <p className="text-sm font-bold text-primary">{(order.total_amount || 0).toFixed(2)} ₼</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}