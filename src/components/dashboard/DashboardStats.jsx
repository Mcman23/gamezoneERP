import React from 'react';
import { Card } from '@/components/ui/card';
import { Monitor, Gamepad2, Clock, DollarSign } from 'lucide-react';

export default function DashboardStats({ tables, activeSessions }) {
  const totalTables = tables.length;
  const occupiedTables = tables.filter(t => t.status === 'occupied').length;
  const pcCount = tables.filter(t => t.type === 'pc' && t.status === 'occupied').length;
  const psCount = tables.filter(t => t.type === 'playstation' && t.status === 'occupied').length;
  const activeRevenue = activeSessions.reduce((sum, s) => sum + (s.session_cost || 0) + (s.orders_cost || 0), 0);

  const stats = [
    {
      label: 'Aktiv Masalar',
      value: `${occupiedTables}/${totalTables}`,
      icon: Monitor,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'PC Aktiv',
      value: pcCount,
      icon: Monitor,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      label: 'PS Aktiv',
      value: psCount,
      icon: Gamepad2,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      label: 'Cari Gəlir',
      value: `${activeRevenue.toFixed(2)} ₼`,
      icon: DollarSign,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  return (
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
  );
}