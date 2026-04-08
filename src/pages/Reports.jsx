import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, isWithinInterval, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import { Download, Search, Monitor, Gamepad2 } from 'lucide-react';
import ReportStats from '@/components/reports/ReportStats';
import RevenueChart from '@/components/reports/RevenueChart';
import PeakHoursChart from '@/components/reports/PeakHoursChart';
import TopProductsChart from '@/components/reports/TopProductsChart';
import TableUsageChart from '@/components/reports/TableUsageChart';
import RecentSessionsTable from '@/components/reports/RecentSessionsTable';

const PERIODS = [
  { key: 'today', label: 'Bu gün' },
  { key: 'week', label: 'Bu həftə' },
  { key: 'month', label: 'Bu ay' },
  { key: 'custom', label: 'Xüsusi' },
];

function getInterval(period, customFrom, customTo) {
  const now = new Date();
  if (period === 'today') return { start: startOfDay(now), end: endOfDay(now) };
  if (period === 'week') return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  if (period === 'month') return { start: startOfMonth(now), end: endOfMonth(now) };
  if (period === 'custom' && customFrom && customTo) {
    return { start: new Date(customFrom), end: new Date(customTo) };
  }
  return { start: startOfDay(now), end: endOfDay(now) };
}

function exportCSV(sessions, orders, period) {
  const rows = [['Masa', 'Başlanğıc', 'Müddət (dəq)', 'Sessiya gəliri (₼)', 'Sifariş gəliri (₼)', 'Cəmi (₼)', 'Ödəmə']];
  sessions.forEach(s => {
    rows.push([
      s.table_name || '',
      s.created_date ? format(new Date(s.created_date), 'dd/MM/yyyy HH:mm') : '',
      s.duration_minutes || 0,
      (s.session_cost || 0).toFixed(2),
      (s.orders_cost || 0).toFixed(2),
      (s.total_cost || 0).toFixed(2),
      s.payment_method === 'card' ? 'Kart' : 'Nağd',
    ]);
  });

  const orderRows = [['', ''], ['-- SİFARİŞLƏR --', ''], ['Masa', 'Tarix', 'Məbləğ (₼)']];
  orders.forEach(o => {
    orderRows.push([o.table_name || '', o.created_date ? format(new Date(o.created_date), 'dd/MM/yyyy HH:mm') : '', (o.total_amount || 0).toFixed(2)]);
  });

  const allRows = [...rows, ...orderRows];
  const csv = allRows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hesabat_${period}_${format(new Date(), 'yyyyMMdd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [period, setPeriod] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: sessions = [] } = useQuery({
    queryKey: ['all-sessions'],
    queryFn: () => base44.entities.Session.filter({ status: 'completed' }, '-created_date', 1000),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['all-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 1000),
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => base44.entities.GameTable.list(),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['all-expenses'],
    queryFn: () => base44.entities.Expense.list('-created_date', 1000),
  });

  const interval = useMemo(() => getInterval(period, customFrom, customTo), [period, customFrom, customTo]);

  const filteredSessions = useMemo(() => {
    let list = sessions.filter(s => {
      try { return isWithinInterval(new Date(s.created_date), interval); } catch { return false; }
    });
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => (s.table_name || '').toLowerCase().includes(q));
    }
    return list;
  }, [sessions, interval, searchQuery]);

  const filteredOrders = useMemo(() => {
    let list = orders.filter(o => {
      try { return isWithinInterval(new Date(o.created_date), interval); } catch { return false; }
    });
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o => (o.table_name || '').toLowerCase().includes(q));
    }
    return list;
  }, [orders, interval, searchQuery]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      try { return isWithinInterval(new Date(e.date || e.created_date), interval); } catch { return false; }
    });
  }, [expenses, interval]);

  const sessionRevenue = filteredSessions.reduce((s, se) => s + (se.session_cost || 0), 0);
  const orderRevenue = filteredOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const totalRevenue = sessionRevenue + orderRevenue;
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const sessionCount = filteredSessions.length;
  const avgDuration = sessionCount > 0
    ? Math.round(filteredSessions.reduce((s, se) => s + (se.duration_minutes || 0), 0) / sessionCount) : 0;
  const tableUsageRate = tables.length > 0
    ? Math.round((tables.filter(t => t.status === 'occupied').length / tables.length) * 100) : 0;

  const revenueData = useMemo(() => {
    const map = {};
    const fmt = period === 'today' ? 'HH:00' : 'dd/MM';
    filteredSessions.forEach(s => {
      const key = format(new Date(s.created_date), fmt);
      if (!map[key]) map[key] = { label: key, sessions: 0, orders: 0 };
      map[key].sessions += (s.session_cost || 0);
    });
    filteredOrders.forEach(o => {
      const key = format(new Date(o.created_date), fmt);
      if (!map[key]) map[key] = { label: key, sessions: 0, orders: 0 };
      map[key].orders += (o.total_amount || 0);
    });
    return Object.values(map).sort((a, b) => a.label.localeCompare(b.label));
  }, [filteredSessions, filteredOrders, period]);

  // Per-table revenue
  const tableRevenue = useMemo(() => {
    const map = {};
    filteredSessions.forEach(s => {
      if (!map[s.table_name]) map[s.table_name] = { name: s.table_name, sessions: 0, orders: 0, sessionCount: 0 };
      map[s.table_name].sessions += (s.session_cost || 0);
      map[s.table_name].sessionCount += 1;
    });
    filteredOrders.forEach(o => {
      if (!map[o.table_name]) map[o.table_name] = { name: o.table_name, sessions: 0, orders: 0, sessionCount: 0 };
      map[o.table_name].orders += (o.total_amount || 0);
    });
    return Object.values(map)
      .map(t => ({ ...t, total: t.sessions + t.orders }))
      .sort((a, b) => b.total - a.total);
  }, [filteredSessions, filteredOrders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Hesabatlar</h1>
          <p className="text-sm text-muted-foreground mt-1">Gəlir və statistika</p>
        </div>
        <Button variant="outline" onClick={() => exportCSV(filteredSessions, filteredOrders, period)} className="gap-2">
          <Download className="w-4 h-4" /> Excel / CSV
        </Button>
      </motion.div>

      {/* Period Tabs + Custom Range */}
      <div className="flex flex-wrap gap-2 items-center">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p.key ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
        {period === 'custom' && (
          <div className="flex items-center gap-2 mt-1 sm:mt-0">
            <Input type="datetime-local" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="bg-secondary border-border text-xs w-44" />
            <span className="text-muted-foreground text-sm">—</span>
            <Input type="datetime-local" value={customTo} onChange={e => setCustomTo(e.target.value)} className="bg-secondary border-border text-xs w-44" />
          </div>
        )}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Masa axtar..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border text-sm h-9 w-40"
          />
        </div>
      </div>

      {/* Stats Row */}
      <ReportStats
        totalRevenue={totalRevenue}
        sessionRevenue={sessionRevenue}
        orderRevenue={orderRevenue}
        sessionCount={sessionCount}
        avgDuration={avgDuration}
        tableUsageRate={tableUsageRate}
      />

      {/* Revenue + Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RevenueChart data={revenueData} period={period} />
        <PeakHoursChart sessions={filteredSessions} />
      </div>

      {/* Top Products + Table Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TopProductsChart orders={filteredOrders} />
        <TableUsageChart sessions={filteredSessions} />
      </div>

      {/* Per-Table Revenue Breakdown */}
      {tableRevenue.length > 0 && (
        <Card className="border-border p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            Masaya görə gəlir
          </h3>
          <div className="space-y-3">
            {tableRevenue.map((t, i) => {
              const pct = totalRevenue > 0 ? (t.total / totalRevenue) * 100 : 0;
              return (
                <div key={t.name || i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground w-5">{i + 1}.</span>
                      <span className="text-sm font-medium text-foreground">{t.name || 'Bilinməyən'}</span>
                      <span className="text-xs text-muted-foreground">({t.sessionCount} sessiya)</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-primary">{t.total.toFixed(2)} ₼</span>
                      <span className="text-xs text-muted-foreground ml-2">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Recent Sessions */}
      <RecentSessionsTable sessions={filteredSessions} />
    </div>
  );
}