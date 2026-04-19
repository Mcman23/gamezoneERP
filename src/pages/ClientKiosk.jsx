import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

// Client Kiosk page — runs on each gaming table's machine
// URL: /kiosk?table_id=PC1
// Polls for product updates every 30s via real-time subscribe + polling fallback

export default function ClientKiosk() {
  const params = new URLSearchParams(window.location.search);
  const tableId = params.get('table_id') || 'UNKNOWN';
  const [lastVersion, setLastVersion] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [status, setStatus] = useState('connecting');

  const { data: products = [], refetch } = useQuery({
    queryKey: ['kiosk-products'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getProductUpdates', {});
      return res.data?.products || [];
    },
    refetchInterval: 30000,
    onSuccess: (data) => {
      setLastSync(new Date());
      setStatus('online');
    },
    onError: () => setStatus('offline'),
  });

  // Real-time subscribe to product changes
  useEffect(() => {
    const unsub = base44.entities.Product.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') {
        setStatus('syncing');
        setTimeout(() => {
          refetch();
          setStatus('online');
        }, 500);
      }
    });
    return () => unsub();
  }, [refetch]);

  const categoryLabels = {
    icki: '🥤 İçki',
    yemek: '🍔 Yemək',
    atistirmalik: '🍿 Atıştırmalıq',
    diger: '🚬 Digər',
  };

  const grouped = products.reduce((acc, p) => {
    const cat = p.category || 'diger';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    syncing: 'bg-yellow-500',
    connecting: 'bg-blue-500',
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-border pb-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">GameZone Menü</h1>
          <p className="text-xs text-muted-foreground">Masa: {tableId}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${statusColors[status]} animate-pulse`} />
          <span className="text-xs text-muted-foreground capitalize">{status}</span>
          {lastSync && (
            <span className="text-xs text-muted-foreground">
              · {lastSync.toLocaleTimeString('az-AZ')}
            </span>
          )}
        </div>
      </div>

      {/* Product Grid by Category */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat} className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">
            {categoryLabels[cat] || cat}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {items.map(p => (
              <div
                key={p.id}
                className="bg-card border border-border rounded-xl p-3 flex flex-col gap-1"
              >
                <p className="text-sm font-semibold text-foreground leading-tight">{p.name}</p>
                <p className="text-primary font-bold text-base">{p.price?.toFixed(2)} ₼</p>
                <p className="text-xs text-muted-foreground">
                  Stok: {p.stock_quantity ?? '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {products.length === 0 && (
        <div className="flex items-center justify-center h-40 text-muted-foreground">
          Məhsullar yüklənir...
        </div>
      )}
    </div>
  );
}