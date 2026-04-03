import React from 'react';
import { Card } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend
} from 'recharts';

const tooltipStyle = {
  background: 'hsl(222,40%,10%)',
  border: '1px solid hsl(222,30%,18%)',
  borderRadius: '10px',
  color: 'hsl(210,40%,96%)',
  fontSize: 12,
};

export default function RevenueChart({ data, period }) {
  const label = period === 'today' ? 'Saat' : 'Gün';

  return (
    <Card className="p-5 border-border col-span-1 lg:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-foreground">Gəlir Dinamikası</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{label} üzrə sessiya və sifariş gəliri</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
            <span className="text-muted-foreground">Sessiya</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-accent" />
            <span className="text-muted-foreground">Sifariş</span>
          </div>
        </div>
      </div>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} barGap={3}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,16%)" vertical={false} />
            <XAxis dataKey="label" stroke="hsl(215,20%,45%)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(215,20%,45%)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}₼`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v.toFixed(2)} ₼`, n === 'sessions' ? 'Sessiya' : 'Sifariş']} cursor={{ fill: 'hsl(222,30%,16%)' }} />
            <Bar dataKey="sessions" name="Sessiya" fill="hsl(142,76%,46%)" radius={[5, 5, 0, 0]} maxBarSize={36} />
            <Bar dataKey="orders" name="Sifariş" fill="hsl(262,83%,58%)" radius={[5, 5, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">Məlumat yoxdur</div>
      )}
    </Card>
  );
}