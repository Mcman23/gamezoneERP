import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Monitor, ShoppingCart, TrendingUp, Calendar } from 'lucide-react';
import { format, startOfDay, startOfMonth, endOfDay, endOfMonth, isWithinInterval, subDays } from 'date-fns';

const COLORS = ['hsl(142,76%,46%)', 'hsl(262,83%,58%)', 'hsl(38,92%,50%)', 'hsl(199,89%,48%)', 'hsl(0,72%,51%)'];

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

  const filteredSessions = useMemo(() => {
    const now = new Date();
    let start, end;
    if (period === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (period === 'week') {
      start = subDays(startOfDay(now), 7);
      end = endOfDay(now);
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }
    return sessions.filter(s => {
      const d = new Date(s.created_date);
      return isWithinInterval(d, { start, end });
    });
  }, [sessions, period]);

  const filteredOrders = useMemo(() => {
    const now = new Date();
    let start, end;
    if (period === 'today') {
      start = startOfDay(now);
      end = endOfDay(now);
    } else if (period === 'week') {
      start = subDays(startOfDay(now), 7);
      end = endOfDay(now);
    } else {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }
    return orders.filter(o => {
      const d = new Date(o.created_date);
      return isWithinInterval(d, { start, end });
    });
  }, [orders, period]);

  const totalSessionRevenue = filteredSessions.reduce((s, se) => s + (se.session_cost || 0), 0);
  const totalOrderRevenue = filteredOrders.reduce((s, o) => s + (o.total_amount || 0), 0);
  const totalRevenue = totalSessionRevenue + totalOrderRevenue;
  const sessionCount = filteredSessions.length;

  // Daily breakdown for chart
  const dailyData = useMemo(() => {
    const map = {};
    filteredSessions.forEach(s => {
      const day = format(new Date(s.created_date), 'dd/MM');
      if (!map[day]) map[day] = { day, sessions: 0, orders: 0 };
      map[day].sessions += (s.session_cost || 0);
    });
    filteredOrders.forEach(o => {
      const day = format(new Date(o.created_date), 'dd/MM');
      if (!map[day]) map[day] = { day, sessions: 0, orders: 0 };
      map[day].orders += (o.total_amount || 0);
    });
    return Object.values(map).sort((a, b) => a.day.localeCompare(b.day));
  }, [filteredSessions, filteredOrders]);

  // Pie data
  const pieData = [
    { name: 'Sessiyalar', value: totalSessionRevenue },
    { name: 'Sifarişlər', value: totalOrderRevenue },
  ].filter(d => d.value > 0);

  const stats = [
    { label: 'Ümumi Gəlir', value: `${totalRevenue.toFixed(2)} ₼`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Sessiya Gəliri', value: `${totalSessionRevenue.toFixed(2)} ₼`, icon: Monitor, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Sifariş Gəliri', value: `${totalOrderRevenue.toFixed(2)} ₼`, icon: ShoppingCart, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Sessiya Sayı', value: sessionCount, icon: TrendingUp, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Hesabatlar</h1>
          <p className="text-sm text-muted-foreground mt-1">Gəlir və statistika</p>
        </div>
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="today">Bu gün</TabsTrigger>
            <TabsTrigger value="week">Həftə</TabsTrigger>
            <TabsTrigger value="month">Ay</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <Card key={i} className="p-4 border-border">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="col-span-1 lg:col-span-2 p-4 border-border">
          <h3 className="font-semibold text-foreground mb-4">Gündəlik Gəlir</h3>
          {dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyData}>
                <XAxis dataKey="day" stroke="hsl(215,20%,55%)" fontSize={11} />
                <YAxis stroke="hsl(215,20%,55%)" fontSize={11} />
                <Tooltip
                  contentStyle={{ background: 'hsl(222,40%,10%)', border: '1px solid hsl(222,30%,18%)', borderRadius: '8px', color: 'hsl(210,40%,96%)' }}
                  formatter={(value) => [`${value.toFixed(2)} ₼`]}
                />
                <Bar dataKey="sessions" name="Sessiya" fill="hsl(142,76%,46%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="orders" name="Sifariş" fill="hsl(262,83%,58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Məlumat yoxdur</div>
          )}
        </Card>

        <Card className="p-4 border-border">
          <h3 className="font-semibold text-foreground mb-4">Gəlir Paylanması</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'hsl(222,40%,10%)', border: '1px solid hsl(222,30%,18%)', borderRadius: '8px', color: 'hsl(210,40%,96%)' }}
                  formatter={(value) => [`${value.toFixed(2)} ₼`]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">Məlumat yoxdur</div>
          )}
          <div className="space-y-2 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i] }} />
                  <span className="text-muted-foreground">{d.name}</span>
                </div>
                <span className="font-medium text-foreground">{d.value.toFixed(2)} ₼</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Sessions List */}
      <Card className="border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Son Sessiyalar</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50 text-xs text-muted-foreground">
                <th className="text-left px-4 py-3 font-medium">Masa</th>
                <th className="text-left px-4 py-3 font-medium">Tarix</th>
                <th className="text-left px-4 py-3 font-medium">Müddət</th>
                <th className="text-right px-4 py-3 font-medium">Sessiya</th>
                <th className="text-right px-4 py-3 font-medium">Sifariş</th>
                <th className="text-right px-4 py-3 font-medium">Cəmi</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.slice(0, 20).map(s => (
                <tr key={s.id} className="border-t border-border text-sm hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{s.table_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(s.created_date), 'dd/MM HH:mm')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.duration_minutes} dəq</td>
                  <td className="px-4 py-3 text-right text-foreground">{(s.session_cost || 0).toFixed(2)} ₼</td>
                  <td className="px-4 py-3 text-right text-foreground">{(s.orders_cost || 0).toFixed(2)} ₼</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">{(s.total_cost || 0).toFixed(2)} ₼</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSessions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">Bu dövr üçün sessiya tapılmadı</div>
          )}
        </div>
      </Card>
    </div>
  );
}