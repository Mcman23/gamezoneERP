import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function RecentSessionsTable({ sessions }) {
  return (
    <Card className="border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Son Sessiyalar</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{sessions.length} sessiya tapıldı</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/40 text-xs text-muted-foreground">
              <th className="text-left px-5 py-3 font-medium">Masa</th>
              <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Tarix</th>
              <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Müddət</th>
              <th className="text-right px-4 py-3 font-medium">Sessiya</th>
              <th className="text-right px-4 py-3 font-medium hidden sm:table-cell">Sifariş</th>
              <th className="text-right px-5 py-3 font-medium">Cəmi</th>
            </tr>
          </thead>
          <tbody>
            {sessions.slice(0, 15).map(s => (
              <tr key={s.id} className="border-t border-border hover:bg-secondary/20 transition-colors">
                <td className="px-5 py-3 font-medium text-foreground">{s.table_name}</td>
                <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{format(new Date(s.created_date), 'dd/MM HH:mm')}</td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.duration_minutes} dəq</td>
                <td className="px-4 py-3 text-right text-foreground">{(s.session_cost || 0).toFixed(2)} ₼</td>
                <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{(s.orders_cost || 0).toFixed(2)} ₼</td>
                <td className="px-5 py-3 text-right font-bold text-primary">{(s.total_cost || 0).toFixed(2)} ₼</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">Bu dövr üçün sessiya tapılmadı</div>
        )}
      </div>
    </Card>
  );
}