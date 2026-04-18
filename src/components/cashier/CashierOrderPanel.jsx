import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { fetchClubEntities } from '@/hooks/useClub';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Gamepad2, Tv2, ShoppingCart, Plus, Minus, Trash2, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTableActions } from '@/hooks/useTableActions';
import { useQueryClient } from '@tanstack/react-query';

const catIcons = { computer: Monitor, playstation: Gamepad2, cabinet: Gamepad2, simulator: Tv2 };
const catColors = {
  yemek: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  icki: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  atistirmalik: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  diger: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};
const catLabels = { yemek: 'Yemək', icki: 'İçki', atistirmalik: 'Atıştırmalıq', diger: 'Digər' };

export default function CashierOrderPanel({ user, clubOwnerId }) {
  const queryClient = useQueryClient();
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState({});
  const [activeCategory, setActiveCategory] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  const actions = useTableActions(queryClient, {}, clubOwnerId);

  const { data: tables = [] } = useQuery({
    queryKey: ['cashier-tables', clubOwnerId],
    queryFn: () => user ? fetchClubEntities(base44.entities.GameTable, user, {}, 'order_number') : [],
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['cashier-active-sessions', clubOwnerId],
    queryFn: async () => {
      if (!user) return [];
      const all = await fetchClubEntities(base44.entities.Session, user, {}, '-created_date', 100);
      return all.filter(s => s.status === 'active' || s.status === 'paused');
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['cashier-products', clubOwnerId],
    queryFn: () => user ? fetchClubEntities(base44.entities.Product, user, {}, 'name') : [],
    enabled: !!user,
  });

  const sessionMap = {};
  activeSessions.forEach(s => { sessionMap[s.table_id] = s; });

  const occupiedTables = tables.filter(t => t.status === 'occupied');
  const selectedSession = selectedTable ? sessionMap[selectedTable.id] : null;

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category))];
    return ['all', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() =>
    products.filter(p => p.in_stock && (activeCategory === 'all' || p.category === activeCategory)),
    [products, activeCategory]);

  const addToCart = (product) => {
    setCart(prev => ({
      ...prev,
      [product.id]: { ...product, qty: (prev[product.id]?.qty || 0) + 1 }
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const current = prev[productId];
      if (!current || current.qty <= 1) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: { ...current, qty: current.qty - 1 } };
    });
  };

  const clearCart = () => setCart({});

  const cartItems = Object.values(cart);
  const cartTotal = cartItems.reduce((a, item) => a + (item.price * item.qty), 0);

  const handleSubmit = async () => {
    if (!selectedTable || !selectedSession || cartItems.length === 0) return;
    setSubmitting(true);
    try {
      const items = cartItems.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.qty,
        unit_price: item.price,
        total_price: item.price * item.qty,
      }));
      await actions.addOrder(selectedTable, selectedSession, items, cartTotal);
      setCart({});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Masaya Sifariş</h2>
        <p className="text-sm text-muted-foreground">Aktiv masaya məhsul əlavə edin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table Selection */}
        <div className="lg:col-span-1">
          <Card className="border-border p-4">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-primary" /> Masa Seçin
            </h3>
            {occupiedTables.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aktiv masa yoxdur</p>
            ) : (
              <div className="space-y-2">
                {occupiedTables.map(table => {
                  const session = sessionMap[table.id];
                  const Icon = catIcons[table.category] || Monitor;
                  const total = session ? ((session.session_cost || 0) + (session.orders_cost || 0)).toFixed(2) : '0.00';
                  return (
                    <button
                      key={table.id}
                      onClick={() => { setSelectedTable(table); setCart({}); }}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left",
                        selectedTable?.id === table.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/50 hover:border-primary/40"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{table.name}</p>
                          {session?.customer_name && (
                            <p className="text-xs text-muted-foreground">{session.customer_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">{total} ₼</p>
                        <ChevronRight className="w-3 h-3 text-muted-foreground ml-auto" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Cart Summary */}
          {cartItems.length > 0 && (
            <Card className="border-border p-4 mt-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-accent" /> Səbət
              </h3>
              <div className="space-y-2 mb-4">
                {cartItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-destructive/20 transition-colors">
                        <Minus className="w-3 h-3 text-muted-foreground" />
                      </button>
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1">{item.qty}</Badge>
                    </div>
                    <span className="text-sm font-bold text-foreground">{(item.price * item.qty).toFixed(2)} ₼</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-3 flex justify-between mb-3">
                <span className="font-bold text-foreground">Cəmi</span>
                <span className="font-black text-xl text-primary">{cartTotal.toFixed(2)} ₼</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={clearCart} className="flex-1">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Sil
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!selectedSession || submitting}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {submitting ? 'Göndərilir...' : 'Göndər'}
                </Button>
              </div>
              {!selectedSession && (
                <p className="text-xs text-destructive mt-2 text-center">Masa seçin</p>
              )}
            </Card>
          )}
        </div>

        {/* Product Grid */}
        <div className="lg:col-span-2">
          <Card className="border-border p-4">
            {/* Category tabs */}
            <div className="flex gap-2 flex-wrap mb-4">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                    activeCategory === cat
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {cat === 'all' ? 'Hamısı' : catLabels[cat] || cat}
                </button>
              ))}
            </div>

            {/* Products */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map(product => {
                const qty = cart[product.id]?.qty || 0;
                return (
                  <div
                    key={product.id}
                    className={cn(
                      "rounded-xl border p-3 transition-all",
                      qty > 0 ? "border-primary/40 bg-primary/5" : "border-border bg-secondary/30 hover:border-border"
                    )}
                  >
                    <div className={cn("inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border mb-2", catColors[product.category] || 'bg-muted text-muted-foreground border-border')}>
                      {catLabels[product.category] || product.category}
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1 leading-tight">{product.name}</p>
                    <p className="text-base font-black text-primary mb-3">{product.price.toFixed(2)} ₼</p>

                    {qty === 0 ? (
                      <Button size="sm" className="w-full h-8 text-xs" onClick={() => addToCart(product)}>
                        <Plus className="w-3 h-3 mr-1" /> Əlavə et
                      </Button>
                    ) : (
                      <div className="flex items-center justify-between">
                        <button onClick={() => removeFromCart(product.id)} className="w-7 h-7 rounded-lg bg-secondary border border-border flex items-center justify-center">
                          <Minus className="w-3 h-3 text-foreground" />
                        </button>
                        <span className="text-sm font-bold text-primary">{qty}</span>
                        <button onClick={() => addToCart(product)} className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                          <Plus className="w-3 h-3 text-primary-foreground" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-3 text-center py-12 text-muted-foreground">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Bu kateqoriyada məhsul yoxdur</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}