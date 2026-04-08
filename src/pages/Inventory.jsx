import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Warehouse, Package, AlertTriangle, PackageX, TrendingUp, Search, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [restockDialog, setRestockDialog] = useState(null);
  const [restockAmount, setRestockAmount] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [reduceDialog, setReduceDialog] = useState(null);
  const [reduceAmount, setReduceAmount] = useState(1);

  const handleReduce = async () => {
    if (!reduceDialog) return;
    const currentQty = reduceDialog.stock_quantity ?? 0;
    const newQty = Math.max(0, currentQty - reduceAmount);
    await base44.entities.Product.update(reduceDialog.id, {
      stock_quantity: newQty,
      in_stock: newQty > 0,
    });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success(`${reduceDialog.name}: -${Math.min(reduceAmount, currentQty)} stokdan silindi. Yeni stok: ${newQty}`);
    setReduceDialog(null);
    setReduceAmount(1);
  };

  const handleDelete = async (product) => {
    await base44.entities.Product.delete(product.id);
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success(`${product.name} anbardan silindi`);
    setDeleteConfirm(null);
  };

  const handleRestock = async () => {
    if (!restockDialog) return;
    const newQty = (restockDialog.stock_quantity ?? 0) + restockAmount;
    await base44.entities.Product.update(restockDialog.id, {
      stock_quantity: newQty,
      in_stock: newQty > 0,
    });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success(`${restockDialog.name}: +${restockAmount} alış qeyd edildi. Yeni stok: ${newQty}`);
    setRestockDialog(null);
    setRestockAmount(10);
  };

  const stats = useMemo(() => {
    const total = products.length;
    const out = products.filter(p => (p.stock_quantity ?? 0) === 0).length;
    const low = products.filter(p => { const q = p.stock_quantity ?? 0; return q > 0 && q <= (p.low_stock_threshold ?? 5); }).length;
    const totalValue = products.reduce((acc, p) => acc + ((p.purchase_price || p.price || 0) * (p.stock_quantity ?? 0)), 0);
    return { total, out, low, totalValue };
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (filterStatus === 'out') list = list.filter(p => (p.stock_quantity ?? 0) === 0);
    else if (filterStatus === 'low') list = list.filter(p => { const q = p.stock_quantity ?? 0; return q > 0 && q <= (p.low_stock_threshold ?? 5); });
    else if (filterStatus === 'ok') list = list.filter(p => (p.stock_quantity ?? 0) > (p.low_stock_threshold ?? 5));
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list.sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0));
  }, [products, filterStatus, searchQuery]);

  const getStockStatus = (p) => {
    const qty = p.stock_quantity ?? 0;
    if (qty === 0) return { label: 'Bitmib', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' };
    if (qty <= (p.low_stock_threshold ?? 5)) return { label: 'Az stok', color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/30' };
    return { label: 'Yaxşı', color: 'text-green-500', bg: 'bg-green-500/10 border-green-500/30' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <Warehouse className="w-7 h-7 text-primary" />
            Anbar / İnventar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Stok səviyyəsi və alış qeydləri</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-primary bg-primary/10 rounded-lg p-1.5" />
            <div>
              <p className="text-xs text-muted-foreground">Ümumi</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-yellow-500 bg-yellow-500/10 rounded-lg p-1.5" />
            <div>
              <p className="text-xs text-yellow-600">Az stok</p>
              <p className="text-xl font-bold text-yellow-500">{stats.low}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-3">
            <PackageX className="w-8 h-8 text-destructive bg-destructive/10 rounded-lg p-1.5" />
            <div>
              <p className="text-xs text-destructive/80">Bitmib</p>
              <p className="text-xl font-bold text-destructive">{stats.out}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-500 bg-green-500/10 rounded-lg p-1.5" />
            <div>
              <p className="text-xs text-green-600">Anbar dəyəri</p>
              <p className="text-xl font-bold text-green-500">{stats.totalValue.toFixed(0)} ₼</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Məhsul axtar..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: 'all', label: 'Hamısı' },
            { key: 'out', label: '✕ Bitmib' },
            { key: 'low', label: '⚠ Az stok' },
            { key: 'ok', label: '✓ Yaxşı' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === f.key ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left p-4 text-xs font-medium text-muted-foreground">Məhsul</th>
                <th className="text-center p-4 text-xs font-medium text-muted-foreground">Kateqoriya</th>
                <th className="text-center p-4 text-xs font-medium text-muted-foreground">Stok</th>
                <th className="text-center p-4 text-xs font-medium text-muted-foreground">Min. Hədd</th>
                <th className="text-center p-4 text-xs font-medium text-muted-foreground">Alış (₼)</th>
                <th className="text-center p-4 text-xs font-medium text-muted-foreground">Satış (₼)</th>
                <th className="text-center p-4 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-center p-4 text-xs font-medium text-muted-foreground">Alış Qeyd</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product, i) => {
                const status = getStockStatus(product);
                return (
                  <tr key={product.id} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-secondary/10'} hover:bg-secondary/20 transition-colors`}>
                    <td className="p-4">
                      <p className="font-medium text-foreground text-sm">{product.name}</p>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant="secondary" className="text-xs">
                        {product.category === 'yemek' ? 'Yemək' : product.category === 'icki' ? 'İçki' : product.category === 'atistirmalik' ? 'Atıştırmalıq' : 'Digər'}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-lg font-bold ${status.color}`}>{product.stock_quantity ?? 0}</span>
                    </td>
                    <td className="p-4 text-center text-sm text-muted-foreground">{product.low_stock_threshold ?? 5}</td>
                    <td className="p-4 text-center text-sm text-muted-foreground">
                      {product.purchase_price ? `${product.purchase_price.toFixed(2)} ₼` : '—'}
                    </td>
                    <td className="p-4 text-center text-sm font-medium text-primary">{product.price.toFixed(2)} ₼</td>
                    <td className="p-4 text-center">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="outline" onClick={() => { setRestockDialog(product); setRestockAmount(10); }} className="h-7 text-xs gap-1">
                          <Plus className="w-3 h-3" /> Alış
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setReduceDialog(product); setReduceAmount(1); }} className="h-7 w-7 p-0 text-yellow-500 hover:bg-yellow-500/10" title="Stok azalt">
                          <span className="text-xs font-bold">−</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(product)} className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">Məhsul tapılmadı</p>
            </div>
          )}
        </div>
      </Card>

      {/* Reduce Stock Dialog */}
      <Dialog open={!!reduceDialog} onOpenChange={(v) => { if (!v) setReduceDialog(null); }}>
        <DialogContent className="bg-card border-border max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-bold text-sm">−</span>
              Stok Azalt
            </DialogTitle>
          </DialogHeader>
          {reduceDialog && (
            <div className="space-y-4 py-2">
              <div className="bg-secondary rounded-xl p-3">
                <p className="font-medium text-foreground text-sm">{reduceDialog.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Mövcud stok: <span className="text-foreground font-bold">{reduceDialog.stock_quantity ?? 0}</span></p>
              </div>
              <div className="flex gap-2">
                {[1, 5, 10, 20].map(n => (
                  <Button key={n} size="sm" variant={reduceAmount === n ? 'default' : 'outline'} onClick={() => setReduceAmount(n)} className="text-xs flex-1">-{n}</Button>
                ))}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Azaldılacaq miqdar</Label>
                <Input type="number" min={1} max={reduceDialog.stock_quantity ?? 0} value={reduceAmount} onChange={e => setReduceAmount(parseInt(e.target.value) || 0)} className="bg-secondary border-border mt-1" />
              </div>
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 flex justify-between">
                <span className="text-sm text-muted-foreground">Yeni stok</span>
                <span className="text-sm font-bold text-yellow-500">{Math.max(0, (reduceDialog.stock_quantity ?? 0) - reduceAmount)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReduceDialog(null)}>Ləğv et</Button>
            <Button onClick={handleReduce} className="bg-yellow-500 hover:bg-yellow-500/90 text-white">Azalt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="bg-card border-border max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-foreground">Anbardan Sil</DialogTitle>
          </DialogHeader>
          {deleteConfirm && (
            <div className="py-2 space-y-3">
              <p className="text-sm text-muted-foreground">"<span className="text-foreground font-medium">{deleteConfirm.name}</span>" məhsulunu anbardan silmək istədiyinizdən əminsiniz?</p>
              <p className="text-xs text-destructive">Bu əməliyyat geri alına bilməz.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Ləğv et</Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={!!restockDialog} onOpenChange={(v) => { if (!v) setRestockDialog(null); }}>
        <DialogContent className="bg-card border-border max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary" />
              Alış Qeydi
            </DialogTitle>
          </DialogHeader>
          {restockDialog && (
            <div className="space-y-4 py-2">
              <div className="bg-secondary rounded-xl p-3">
                <p className="font-medium text-foreground text-sm">{restockDialog.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Mövcud stok: <span className="text-foreground font-bold">{restockDialog.stock_quantity ?? 0}</span></p>
              </div>
              <div className="flex gap-2">
                {[5, 10, 20, 50].map(n => (
                  <Button key={n} size="sm" variant={restockAmount === n ? "default" : "outline"} onClick={() => setRestockAmount(n)} className="text-xs flex-1">+{n}</Button>
                ))}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Alınan miqdar</Label>
                <Input type="number" min={1} value={restockAmount} onChange={e => setRestockAmount(parseInt(e.target.value) || 0)} className="bg-secondary border-border mt-1" />
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex justify-between">
                <span className="text-sm text-muted-foreground">Yeni stok</span>
                <span className="text-sm font-bold text-primary">{(restockDialog.stock_quantity ?? 0) + restockAmount}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestockDialog(null)}>Ləğv et</Button>
            <Button onClick={handleRestock} className="bg-primary hover:bg-primary/90 text-primary-foreground">Alışı qeyd et</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}