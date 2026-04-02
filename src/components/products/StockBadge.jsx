import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, PackageX } from 'lucide-react';

export default function StockBadge({ product }) {
  const qty = product.stock_quantity ?? 0;
  const threshold = product.low_stock_threshold ?? 5;
  const inStock = product.in_stock !== false;

  if (!inStock || qty === 0) {
    return (
      <Badge variant="destructive" className="text-[10px] flex items-center gap-1">
        <PackageX className="w-3 h-3" /> Stokda yox
      </Badge>
    );
  }
  if (qty <= threshold) {
    return (
      <Badge className="text-[10px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> Az qalıb: {qty}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
      <Package className="w-3 h-3" /> Stok: {qty}
    </Badge>
  );
}