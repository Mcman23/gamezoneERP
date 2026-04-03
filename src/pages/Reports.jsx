import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, isWithinInterval } from 'date-fns';
import { motion } from 'framer-motion';
import ReportStats from '@/components/reports/ReportStats';
import RevenueChart from '@/components/reports/RevenueChart';
import PeakHoursChart from '@/components/reports/PeakHoursChart';
import TopProductsChart from '@/components/reports/TopProductsChart';
import TableUsageChart from '@/components/reports/TableUsageChart';
import RecentSessionsTable from '@/components/reports/RecentSessionsTable';

function getInterval(period) {
  const now = new Date();
  if (period === 'today') return { start: startOfDay(now), end: endOfDay(now) };
  if (period === 'week') return { start: subDays(startOfDay(now), 7), end: endOfDay(now) };
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export default function Reports() {
  const [period, setPeriod] = useState('today');

  const { data: sessions = [] } = useQuery({
    queryKey: ['all-sessions'],
    queryFn: () => base44.entities.Session.filter({ status: 'completed' }, '-created_date', 500),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['all-orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 500),
  });

  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => base44.entities.GameTable.list(),
  });

  const interval = useMemo(() => getInterval(period), [period]);

  const filteredSessions = useMemo(() =>
    sessions.filter(s => isWithinInterval(new Date(s.created_date), interval)),
    [sessions, interval]
  );

  const filteredOrders = useMemo(() =>
    orders.filter(o => isWithinInterval(new Date(o.created_date), interval)),
    [orders, interval]
  );

  // Stats calculations
  const sessionRevenue = filteredSessions.reduce((s, se) => s + (se.session_cost || 0), 0);
  const orderRevenue = filteredOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const totalRevenue = sessionRevenue + orderRevenue;
  const sessionCount = filteredSessions.length;
  const avgDuration = sessionCount > 0
    ? Math.round(filteredSessions.reduce((s, se) => s + (se.duration_minutes || 0), 0) / sessionCount)
    : 0;
  const tableUsageRate = tables.length > 0
    ? Math.round((tables.filter(t => t.status === 'occupied').length / tables.length) * 100)
    : 0;

  // Revenue chart data
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

  const periodLabels = { today: 'Bu gün', week: 'Bu həftə', month: 'Bu ay' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Hesabatlar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {periodLabels[period]} üçün gəlir və statistika
          </p>
        </div>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="bg-secondary border border-border">
            <TabsTrigger value="today">Bu gün</TabsTrigger>
            <TabsTrigger value="week">Həftə</TabsTrigger>
            <TabsTrigger value="month">Ay</TabsTrigger>
          </TabsList>
        </Tabs>
      </motion.div>

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

      {/* Recent Sessions */}
      <RecentSessionsTable sessions={filteredSessions} />
    </div>
  );
}