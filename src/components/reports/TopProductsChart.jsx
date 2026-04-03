import React from 'react';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { ShoppingCart } from 'lucide-react';

const COLORS = [
  'hsl(142,76%,46%)', 'hsl(262,83%,58%)', 'hsl(38,92%,50%)',
  'hsl(199,89%,48%)', 'hsl(0,72%,51%)', 'hsl(320,70%,50%)',
];

const tooltipStyle = {
  background: 'hsl(222,40%,10%)',
  border: '1px solid hsl(222,30%,18%)',
  borderRadius: '10px',
  color: 'hsl(210,40%,96%)',
  fontSize: 12,
};

export default function TopProductsChart({ orders }) {
  const productMap = {};
  orders.forEach(order => {
    (order.items || []).forEach(item => {
      if (!productMap[item.product_name]) {
        productMap[item.product_name] = { name: item.product_name, qty: 0, revenue: 0 };
      }
      productMap[item.product_name].qty += item.quantity || 0;
      productMap[item.product_name].revenue += item.total_price || 0;
    });
  });

  const data = Object.values(productMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8)
    .map(d => ({ ...d, shortName: d.name.length > 10 ? d.name.slice(0, 10) + '…' : d.name }));

  return (
    <Card className="p-5 border-border col-span-1 lg:col-span-2">
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">Ən Çox Satılan Məhsullar</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Satış miqdarına görə top 8</p>
      </div>
      {data.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical" barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,30%,16%)" horizontal={false} />
              <XAxis type="number" stroke="hsl(215,20%,45%)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis dataKey="shortName" type="category" stroke="hsl(215,20%,45%)" fontSize={10} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v, 'Ədəd']} cursor={{ fill: 'hsl(222,30%,16%)' }} />
              <Bar dataKey="qty" radius={[0, 5, 5, 0]}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {data.slice(0, 5).map((p, i) => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-muted-foreground truncate max-w-[120px]">{p.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-foreground font-medium">{p.qty} ədəd</span>
                  <span className="text-xs text-primary font-bold">{p.revenue.toFixed(2)} ₼</span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-[220px] gap-2">
          <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm">Bu dövr üçün sifariş yoxdur</p>
        </div>
      )}
    </Card>
  );
}