import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Plus, Minus, Coffee, GlassWater, Cookie, Package, CheckCircle2, Clock, Loader2, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const categoryIcons = { yemek: Coffee, icki: GlassWater, atistirmalik: Cookie, diger: Package };
const categoryLabels = { yemek: 'Yemək', icki: 'İçki', atistirmalik: 'Atıştırmalıq', diger: 'Digər', all: 'Hamısı' };

export default function CustomerPanel() {
  const queryClient = useQueryClient();
  const [cart, setCart] = useState({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [tableId, setTableId] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // get table_id from url param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tid = params.get('table');
    if (tid) setTableId(tid);
  }, []);

  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => base44.entities.GameTable.list(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: () => base44.entities.Session.filter({ status: 'active' }),
  });

  const currentTable = tables.find(t => t.id === tableId);
  const currentSession = activeSessions.find(s => s.table_id === tableId);

  const inStockProducts = products.filter(p => p.in_stock !== false && (p.stock_quantity == null || p.stock_quantity > 0));
  const filteredProducts = activeCategory === 'all' ? inStockProducts : inStockProducts.filter(p => p.category === activeCategory);
  const categories = ['all', ...new Set(inStockProducts.map(p => p.category))];

  const addToCart = (product) => {
    setCart(prev => ({ ...prev, [product.id]: { product, quantity: (prev[product.id]?.quantity || 0) + 1 } }));
  };
  const removeFromCart = (productId) => {
    setCart(prev => {
      const next = { ...prev };
      if (next[productId]?.quantity > 1) next[productId] = { ...next[productId], quantity: next[productId].quantity - 1 };
      else delete next[productId];
      return next;
    });
  };

  const totalAmount = Object.values(cart).reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

  const handleOrder = async () => {
    if (!currentTable) { toast.error('Masa tapılmadı'); return; }
    setSubmitting(true);
    const items = Object.values(cart).map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.product.price,
      total_price: item.product.price * item.quantity,
    }));

    await base44.entities.CustomerOrder.create({
      session_id: currentSession?.id || '',
      table_id: currentTable.id,
      table_name: currentTable.name,
      items,
      total_amount: totalAmount,
      note,
      status: 'new',
    });

    // deduct stock
    await Promise.all(Object.values(cart).map(async item => {
      const newQty = Math.max(0, (item.product.stock_quantity ?? 0) - item.quantity);
      await base44.entities.Product.update(item.product.id, { stock_quantity: newQty, in_stock: newQty > 0 });
    }));

    setSubmitting(false);
    setSubmitted(true);
    setCart({});
    setNote('');
    queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Sifariş Göndərildi!</h2>
          <p className="text-muted-foreground mb-2">Kassir sifarişinizi qəbul etdi.</p>
          <p className="text-muted-foreground text-sm mb-8">Xidmət zamanı biraz gözləyin.</p>
          {currentTable && (
            <div className="bg-secondary rounded-xl p-3 mb-6 flex items-center gap-3 justify-center">
              <Gamepad2 className="w-5 h-5 text-primary" />
              <span className="text-foreground font-semibold">{currentTable.name}</span>
            </div>
          )}
          <Button onClick={() => setSubmitted(false)} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">
            Yenidən Sifariş Et
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">Sifariş Paneli</p>
            {currentTable && <p className="text-xs text-muted-foreground">{currentTable.name}</p>}
          </div>
        </div>
        {cartCount > 0 && (
          <Badge className="bg-primary text-primary-foreground">{cartCount} məhsul · {totalAmount.toFixed(2)} ₼</Badge>
        )}
      </div>

      {!tableId && (
        <div className="p-6 max-w-sm mx-auto mt-8 space-y-4">
          <p className="text-muted-foreground text-sm text-center">Masa seçin:</p>
          <div className="grid grid-cols-3 gap-2">
            {tables.map(t => (
              <button key={t.id} onClick={() => setTableId(t.id)}
                className="p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium text-foreground flex flex-col items-center gap-1.5">
                {t.type === 'pc' ? <Coffee className="w-4 h-4 text-blue-400" /> : <Gamepad2 className="w-4 h-4 text-accent" />}
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {tableId && (
        <div className="pb-36">
          {/* Categories */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-border">
            {categories.map(cat => {
              const Icon = categoryIcons[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                    activeCategory === cat
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {categoryLabels[cat] || cat}
                </button>
              );
            })}
          </div>

          {/* Products */}
          <div className="p-4 grid grid-cols-2 gap-3">
            {filteredProducts.map(product => {
              const inCart = cart[product.id]?.quantity || 0;
              const Icon = categoryIcons[product.category] || Package;
              return (
                <motion.div
                  key={product.id}
                  layout
                  className={cn(
                    "rounded-2xl border p-4 transition-all cursor-pointer select-none",
                    inCart > 0
                      ? "border-primary/40 bg-primary/8 shadow-sm shadow-primary/10"
                      : "border-border bg-card hover:border-primary/20 hover:bg-secondary/50"
                  )}
                  onClick={() => addToCart(product)}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", inCart > 0 ? "bg-primary/20" : "bg-secondary")}>
                    <Icon className={cn("w-5 h-5", inCart > 0 ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight mb-1">{product.name}</p>
                  <p className="text-base font-bold text-primary">{product.price.toFixed(2)} ₼</p>
                  {inCart > 0 && (
                    <div className="mt-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => removeFromCart(product.id)} className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-border transition-colors">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold text-foreground w-5 text-center">{inCart}</span>
                      <button onClick={() => addToCart(product)} className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors">
                        <Plus className="w-3.5 h-3.5 text-primary" />
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Note */}
          {cartCount > 0 && (
            <div className="px-4">
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Qeyd əlavə et (isteğe bağlı)" className="bg-secondary border-border" />
            </div>
          )}
        </div>
      )}

      {/* Sticky cart bottom */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4"
          >
            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
              {Object.values(cart).map(item => (
                <div key={item.product.id} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.product.name} ×{item.quantity}</span>
                  <span className="text-foreground font-medium">{(item.product.price * item.quantity).toFixed(2)} ₼</span>
                </div>
              ))}
            </div>
            <Button
              onClick={handleOrder}
              disabled={submitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base font-semibold rounded-xl"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShoppingCart className="w-4 h-4 mr-2" />}
              Sifariş et — {totalAmount.toFixed(2)} ₼
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}