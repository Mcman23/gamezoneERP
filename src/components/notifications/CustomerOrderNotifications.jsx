import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingCart, X, Check, Coffee, GlassWater, Cookie, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const categoryIcons = { yemek: Coffee, icki: GlassWater, atistirmalik: Cookie, diger: Package };

function playOrderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playNote = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    playNote(880, 0, 0.12);
    playNote(1100, 0.13, 0.12);
    playNote(1320, 0.26, 0.2);
  } catch (e) {}
}

export default function CustomerOrderNotifications() {
  const queryClient = useQueryClient();
  const [popups, setPopups] = useState([]);
  const seenRef = useRef(new Set());

  const { data: orders = [] } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: () => base44.entities.CustomerOrder.filter({ status: 'new' }, '-created_date', 50),
    refetchInterval: 5000,
  });

  useEffect(() => {
    orders.forEach(order => {
      if (!seenRef.current.has(order.id)) {
        seenRef.current.add(order.id);
        playOrderSound();
        setPopups(prev => [...prev, order]);
      }
    });
  }, [orders]);

  const markSeen = async (order) => {
    await base44.entities.CustomerOrder.update(order.id, { status: 'seen' });
    queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    setPopups(prev => prev.filter(p => p.id !== order.id));
  };

  const markDelivered = async (order) => {
    await base44.entities.CustomerOrder.update(order.id, { status: 'delivered' });
    queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
    setPopups(prev => prev.filter(p => p.id !== order.id));
    toast.success(`${order.table_name} sifarişi çatdırıldı`);
  };

  return (
    <div className="fixed top-4 right-4 z-[200] space-y-3 max-w-[340px] w-full pointer-events-none">
      <AnimatePresence>
        {popups.map(order => (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, x: 120, scale: 0.85 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 120, scale: 0.85 }}
            className="pointer-events-auto rounded-2xl border border-accent/40 bg-card shadow-2xl shadow-accent/10 order-ping overflow-hidden"
          >
            {/* Top bar */}
            <div className="bg-accent/15 px-4 py-2.5 flex items-center justify-between border-b border-accent/20">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-accent/20 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Yeni Sifariş!</p>
                  <p className="text-xs text-accent">{order.table_name}</p>
                </div>
              </div>
              <button onClick={() => setPopups(p => p.filter(x => x.id !== order.id))} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items */}
            <div className="px-4 py-3 space-y-1.5">
              {(order.items || []).map((item, i) => {
                const Icon = categoryIcons[item.category] || Package;
                return (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-secondary flex items-center justify-center text-[10px] font-bold text-primary">
                        {item.quantity}×
                      </span>
                      <span className="text-sm text-foreground">{item.product_name}</span>
                    </div>
                    <span className="text-xs font-medium text-primary">{item.total_price?.toFixed(2)} ₼</span>
                  </div>
                );
              })}
              {order.note && (
                <p className="text-xs text-muted-foreground italic mt-1 pt-1 border-t border-border">"{order.note}"</p>
              )}
              <div className="flex justify-between items-center pt-1.5 border-t border-border">
                <span className="text-xs text-muted-foreground">Cəmi</span>
                <span className="font-bold text-base text-accent">{order.total_amount?.toFixed(2)} ₼</span>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 pb-3 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => markSeen(order)} className="flex-1 text-xs h-8">
                Gördüm
              </Button>
              <Button size="sm" onClick={() => markDelivered(order)} className="flex-1 text-xs h-8 bg-accent hover:bg-accent/90 text-accent-foreground">
                <Check className="w-3.5 h-3.5 mr-1" /> Çatdırıldı
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}