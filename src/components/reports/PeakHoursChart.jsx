import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const tooltipStyle = {
  background: 'hsl(222,40%,10%)',
  border: '1px solid hsl(222,30%,18%)',
  borderRadius: '10px',
  color: 'hsl(210,40%,96%)',
  fontSize: 12,
};

export default function PeakHoursChart({ sessions }) {
  const hourMap = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, '0')}:00`, count: 0, h }));

  sessions.forEach(s => {
    const h = new Date(s.start_time || s.created_date).getHours();
    hourMap[h].count += 1;
  });

  const maxCount = Math.max(...hourMap.map(d => d.count), 1);

  return (
    <Card className="p-5 border-border">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Aktiv Saatlar</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Saat üzrə sessiya yüklənməsi</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={hourMap} barSize={10}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,16%)" vertical={false} />
          <XAxis dataKey="hour" stroke="hsl(215,20%,45%)" fontSize={9} tickLine={false} axisLine={false}
            interval={2} />
          <YAxis stroke="hsl(215,20%,45%)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v, 'Sessiya']} labelFormatter={l => `Saat: ${l}`} cursor={{ fill: 'hsl(222,30%,16%)' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {hourMap.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.count === maxCount
                  ? 'hsl(38,92%,50%)'
                  : entry.count >= maxCount * 0.6
                    ? 'hsl(142,76%,46%)'
                    : 'hsl(222,30%,28%)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-3 text-xs">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(38,92%,50%)' }} /><span className="text-muted-foreground">Pik saat</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(142,76%,46%)' }} /><span className="text-muted-foreground">Aktiv</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'hsl(222,30%,28%)' }} /><span className="text-muted-foreground">Sakit</span></div>
      </div>
    </Card>
  );
}