import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { fetchClubEntities } from '@/hooks/useClub';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingBag, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  pending: { label: 'Gözləyir', color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500', dot: 'bg-yellow-500' },
  delivered: { label: 'Çatdırıldı', color: 'bg-green-500/10 border-green-500/30 text-green-500', dot: 'bg-green-500' },
};

export default function ActiveOrders({ user, clubOwnerId }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const queryClient = useQueryClient();

  const loadOrders = async () => {
    if (!user) return;
    try {
      const all = await fetchClubEntities(base44.entities.Order, user, {}, '-created_date', 100);
      // Show only today's orders that are pending or recently delivered
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayOrders = all.filter(o => {
        const d = new Date(o.created_date);
        return d >= today && (o.status === 'pending' || o.status === 'delivered');
      });
      setOrders(todayOrders);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
    // Subscribe to real-time Order changes
    const unsub = base44.entities.Order.subscribe((event) => {
      setOrders(prev => {
        if (event.type === 'create') {
          // Only add if today
          const today = new Date(); today.setHours(0,0,0,0);
          if (new Date(event.data.created_date || Date.now()) >= today) {
            return [event.data, ...prev];
          }
          return prev;
        }
        if (event.type === 'update') {
          return prev.map(o => o.id === event.id ? event.data : o);
        }
        if (event.type === 'delete') {
          return prev.filter(o => o.id !== event.id);
        }
        return prev;
      });
    });
    return () => unsub();
  }, [user, clubOwnerId]);

  const markDelivered = async (order) => {
    setUpdating(order.id);
    await base44.entities.Order.update(order.id, { status: 'delivered' });
    queryClient.invalidateQueries({ queryKey: ['cashier-orders', clubOwnerId] });
    toast.success(`${order.table_name} sifarişi çatdırıldı`);
    setUpdating(null);
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');

  if (loading) return (
    <Card className="border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag className="w-4 h-4 text-accent" />
        <h3 className="font-semibold text-foreground">Aktiv Sifarişlər</h3>
      </div>
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    </Card>
  );

  return (
    <Card className="border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-foreground">Aktiv Sifarişlər</h3>
          {pendingOrders.length > 0 && (
            <span className="bg-yellow-500 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {pendingOrders.length}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">Real-vaxt • Bu gün</span>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aktiv sifariş yoxdur</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Pending first */}
          {pendingOrders.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-yellow-500 uppercase tracking-wide mb-2">Gözləyən ({pendingOrders.length})</p>
              <div className="space-y-2">
                {pendingOrders.map(order => (
                  <OrderRow key={order.id} order={order} onDeliver={markDelivered} updating={updating} />
                ))}
              </div>
            </div>
          )}

          {/* Delivered today */}
          {deliveredOrders.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-green-500 uppercase tracking-wide mb-2 mt-3">Çatdırıldı ({deliveredOrders.length})</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {deliveredOrders.slice(0, 10).map(order => (
                  <OrderRow key={order.id} order={order} onDeliver={markDelivered} updating={updating} delivered />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function OrderRow({ order, onDeliver, updating, delivered = false }) {
  return (
    <div className={`flex items-start justify-between rounded-xl border px-3 py-2.5 gap-3 transition-all ${
      delivered
        ? 'bg-green-500/5 border-green-500/15 opacity-60'
        : 'bg-yellow-500/5 border-yellow-500/25'
    }`}>
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${delivered ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{order.table_name}</p>
            <span className="text-[10px] text-muted-foreground">
              {order.created_date ? format(new Date(order.created_date), 'HH:mm') : ''}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {(order.items || []).map(i => `${i.product_name} ×${i.quantity}`).join(' • ')}
          </p>
          <p className="text-xs font-bold text-primary mt-0.5">{(order.total_amount || 0).toFixed(2)} ₼</p>
        </div>
      </div>
      {!delivered && (
        <Button
          size="sm"
          onClick={() => onDeliver(order)}
          disabled={updating === order.id}
          className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white flex-shrink-0"
        >
          {updating === order.id
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />Çatdır</>
          }
        </Button>
      )}
      {delivered && (
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-1" />
      )}
    </div>
  );
}