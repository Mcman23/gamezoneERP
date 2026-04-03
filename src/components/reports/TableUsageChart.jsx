import React from 'react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['hsl(142,76%,46%)', 'hsl(262,83%,58%)', 'hsl(38,92%,50%)', 'hsl(199,89%,48%)', 'hsl(0,72%,51%)', 'hsl(320,70%,50%)'];

const tooltipStyle = {
  background: 'hsl(222,40%,10%)',
  border: '1px solid hsl(222,30%,18%)',
  borderRadius: '10px',
  color: 'hsl(210,40%,96%)',
  fontSize: 12,
};

export default function TableUsageChart({ sessions }) {
  const tableMap = {};
  sessions.forEach(s => {
    if (!tableMap[s.table_name]) tableMap[s.table_name] = { name: s.table_name, count: 0, minutes: 0 };
    tableMap[s.table_name].count += 1;
    tableMap[s.table_name].minutes += s.duration_minutes || 0;
  });

  const data = Object.values(tableMap).sort((a, b) => b.count - a.count).slice(0, 8);
  const totalSessions = data.reduce((s, d) => s + d.count, 0);

  return (
    <Card className="p-5 border-border">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Masa İstifadəsi</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Masalar üzrə sessiya paylanması</p>
      </div>
      {data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={data} dataKey="count" cx="50%" cy="50%" innerRadius={48} outerRadius={76} paddingAngle={3}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n, p) => [`${v} sessiya`, p.payload.name]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {data.slice(0, 5).map((t, i) => (
              <div key={t.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-xs text-muted-foreground flex-1 truncate">{t.name}</span>
                <span className="text-xs font-medium text-foreground">{t.count}</span>
                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(t.count / (data[0]?.count || 1)) * 100}%`, background: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">Məlumat yoxdur</div>
      )}
    </Card>
  );
}