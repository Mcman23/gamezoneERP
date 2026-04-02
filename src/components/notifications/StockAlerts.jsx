import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, PackageX } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StockAlerts() {
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
    refetchInterval: 60000,
  });

  const outOfStock = products.filter(p => (p.stock_quantity ?? 0) === 0 && p.in_stock !== false);
  const lowStock = products.filter(p => {
    const qty = p.stock_quantity ?? 0;
    const threshold = p.low_stock_threshold ?? 5;
    return qty > 0 && qty <= threshold;
  });

  if (outOfStock.length === 0 && lowStock.length === 0) return null;

  return (
    <div className="space-y-2">
      {outOfStock.length > 0 && (
        <Link to="/products">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-destructive/10 border border-destructive/30 hover:bg-destructive/15 transition-colors cursor-pointer">
            <PackageX className="w-4 h-4 text-destructive shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-destructive">Stokda bitdi ({outOfStock.length})</p>
              <p className="text-[10px] text-destructive/70 truncate">
                {outOfStock.slice(0, 3).map(p => p.name).join(', ')}
                {outOfStock.length > 3 && ` +${outOfStock.length - 3}`}
              </p>
            </div>
          </div>
        </Link>
      )}
      {lowStock.length > 0 && (
        <Link to="/products">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/15 transition-colors cursor-pointer">
            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-yellow-500">Az stok ({lowStock.length})</p>
              <p className="text-[10px] text-yellow-500/70 truncate">
                {lowStock.slice(0, 3).map(p => `${p.name}(${p.stock_quantity})`).join(', ')}
                {lowStock.length > 3 && ` +${lowStock.length - 3}`}
              </p>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}