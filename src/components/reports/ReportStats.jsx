import React from 'react';
import { Card } from '@/components/ui/card';
import { DollarSign, Monitor, ShoppingCart, TrendingUp, Clock, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReportStats({ totalRevenue, sessionRevenue, orderRevenue, sessionCount, avgDuration, totalExpenses, netProfit }) {
  const stats = [
    { label: 'Ümumi Gəlir', value: `${(totalRevenue || 0).toFixed(2)} ₼`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { label: 'Sessiya Gəliri', value: `${(sessionRevenue || 0).toFixed(2)} ₼`, icon: Monitor, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    { label: 'Sifariş Gəliri', value: `${(orderRevenue || 0).toFixed(2)} ₼`, icon: ShoppingCart, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' },
    { label: 'Sessiya Sayı', value: sessionCount || 0, icon: TrendingUp, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { label: 'Xərclər', value: `${(totalExpenses || 0).toFixed(2)} ₼`, icon: TrendingDown, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
    {
      label: 'Xalis Mənfəət',
      value: `${(netProfit || 0).toFixed(2)} ₼`,
      icon: DollarSign,
      color: (netProfit || 0) >= 0 ? 'text-green-500' : 'text-destructive',
      bg: (netProfit || 0) >= 0 ? 'bg-green-500/10' : 'bg-destructive/10',
      border: (netProfit || 0) >= 0 ? 'border-green-500/20' : 'border-destructive/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map((stat, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className={`p-4 border ${stat.border} bg-card hover:bg-secondary/40 transition-colors`}>
            <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-xs text-muted-foreground leading-tight">{stat.label}</p>
            <p className={`text-lg font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}