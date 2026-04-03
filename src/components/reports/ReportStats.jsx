import React from 'react';
import { Card } from '@/components/ui/card';
import { DollarSign, Monitor, ShoppingCart, TrendingUp, Clock, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ReportStats({ totalRevenue, sessionRevenue, orderRevenue, sessionCount, avgDuration, tableUsageRate }) {
  const stats = [
    { label: 'Ümumi Gəlir', value: `${totalRevenue.toFixed(2)} ₼`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
    { label: 'Sessiya Gəliri', value: `${sessionRevenue.toFixed(2)} ₼`, icon: Monitor, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
    { label: 'Sifariş Gəliri', value: `${orderRevenue.toFixed(2)} ₼`, icon: ShoppingCart, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20' },
    { label: 'Sessiya Sayı', value: sessionCount, icon: TrendingUp, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { label: 'Ort. Müddət', value: `${avgDuration} dəq`, icon: Clock, color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/20' },
    { label: 'Masa İstifadəsi', value: `${tableUsageRate}%`, icon: Zap, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
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