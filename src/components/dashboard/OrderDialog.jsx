import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, ShoppingCart, Coffee, Cookie, GlassWater, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const categoryIcons = {
  yemek: Coffee,
  icki: GlassWater,
  atistirmalik: Cookie,
  diger: Package,
};

const categoryLabels = {
  yemek: 'Yemək',
  icki: 'İçki',
  atistirmalik: 'Atıştırmalıq',
  diger: 'Digər',
};

export default function OrderDialog({ open, onOpenChange, table, session, onConfirm }) {
  const [cart, setCart] = useState({});
  const [activeCategory, setActiveCategory] = useState('all');

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const inStockProducts = products.filter(p => p.in_stock !== false && (p.stock_quantity == null || p.stock_quantity > 0));
  const filteredProducts = activeCategory === 'all'
    ? inStockProducts
    : inStockProducts.filter(p => p.category === activeCategory);

  const categories = ['all', ...new Set(inStockProducts.map(p => p.category))];

  const addToCart = (product) => {
    setCart(prev => ({
      ...prev,
      [product.id]: {
        product,
        quantity: (prev[product.id]?.quantity || 0) + 1
      }
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[productId]?.quantity > 1) {
        next[productId] = { ...next[productId], quantity: next[productId].quantity - 1 };
      } else {
        delete next[productId];
      }
      return next;
    });
  };

  const totalAmount = Object.values(cart).reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

  const handleConfirm = async () => {
    const items = Object.values(cart).map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.price,
      total_price: item.product.price * item.quantity,
    }));

    // Deduct stock for each ordered product
    await Promise.all(
      Object.values(cart).map(async (item) => {
        const currentQty = item.product.stock_quantity ?? 0;
        const newQty = Math.max(0, currentQty - item.quantity);
        await base44.entities.Product.update(item.product.id, {
          stock_quantity: newQty,
          in_stock: newQty > 0,
        });
      })
    );

    onConfirm(table, session, items, totalAmount);
    setCart({});
    onOpenChange(false);
  };

  if (!table || !session) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setCart({}); onOpenChange(v); }}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ShoppingCart className="w-5 h-5 text-primary" />
            {table.name} — Sifariş
          </DialogTitle>
        </DialogHeader>

        {/* Categories */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map(cat => (
            <Button
              key={cat}
              size="sm"
              variant={activeCategory === cat ? "default" : "outline"}
              onClick={() => setActiveCategory(cat)}
              className="text-xs shrink-0"
            >
              {cat === 'all' ? 'Hamısı' : categoryLabels[cat] || cat}
            </Button>
          ))}
        </div>

        {/* Products Grid */}
        <ScrollArea className="flex-1 max-h-[300px]">
          <div className="grid grid-cols-2 gap-2 pr-2">
            {filteredProducts.map(product => {
              const inCart = cart[product.id]?.quantity || 0;
              const Icon = categoryIcons[product.category] || Package;
              return (
                <div
                  key={product.id}
                  className={cn(
                    "rounded-lg border p-3 cursor-pointer transition-all hover:border-primary/30",
                    inCart > 0 ? "border-primary/30 bg-primary/5" : "border-border"
                  )}
                  onClick={() => addToCart(product)}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">{product.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-bold text-primary">{product.price.toFixed(2)} ₼</span>
                      {product.stock_quantity != null && (
                        <span className={`ml-1.5 text-[10px] ${product.stock_quantity <= (product.low_stock_threshold ?? 5) ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                          ({product.stock_quantity})
                        </span>
                      )}
                    </div>
                    {inCart > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); removeFromCart(product.id); }}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-bold w-5 text-center">{inCart}</span>
                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); addToCart(product); }}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Cart Summary */}
        {cartCount > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-1.5">
            {Object.values(cart).map(item => (
              <div key={item.product.id} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{item.product.name} x{item.quantity}</span>
                <span className="text-foreground">{(item.product.price * item.quantity).toFixed(2)} ₼</span>
              </div>
            ))}
            <div className="border-t border-border pt-1.5 flex justify-between">
              <span className="font-semibold text-sm text-foreground">Cəmi</span>
              <span className="font-bold text-primary">{totalAmount.toFixed(2)} ₼</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setCart({}); onOpenChange(false); }}>Ləğv et</Button>
          <Button onClick={handleConfirm} disabled={cartCount === 0} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <ShoppingCart className="w-4 h-4 mr-1.5" /> Sifariş et ({cartCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}