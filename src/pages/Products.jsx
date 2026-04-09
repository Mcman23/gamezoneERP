import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useClub, fetchClubEntities } from '@/hooks/useClub';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Coffee, GlassWater, Cookie, Package, AlertTriangle, PackageX, TrendingDown, RotateCcw, Search, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import StockBadge from '@/components/products/StockBadge';

const categoryLabels = { yemek: 'Yemək', icki: 'İçki', atistirmalik: 'Atıştırmalıq', diger: 'Digər' };
const categoryIcons = { yemek: Coffee, icki: GlassWater, atistirmalik: Cookie, diger: Package };

const defaultForm = {
  name: '', category: 'yemek', price: '', purchase_price: '',
  in_stock: true, stock_quantity: 0, low_stock_threshold: 5,
};

function calcMargin(salePrice, purchasePrice) {
  if (!purchasePrice || purchasePrice <= 0) return null;
  return ((salePrice - purchasePrice) / purchasePrice * 100).toFixed(1);
}

export default function Products() {
  const { user } = useOutletContext();
  const { clubOwnerId } = useClub(user);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [restockDialog, setRestockDialog] = useState(null);
  const [restockAmount, setRestockAmount] = useState(10);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [filterTab, setFilterTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', clubOwnerId],
    queryFn: () => user ? fetchClubEntities(base44.entities.Product, user) : [],
    enabled: !!user,
  });

  const resetForm = () => { setForm(defaultForm); setEditing(null); };

  const openEdit = (product) => {
    setForm({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      purchase_price: product.purchase_price?.toString() || '',
      in_stock: product.in_stock !== false,
      stock_quantity: product.stock_quantity ?? 0,
      low_stock_threshold: product.low_stock_threshold ?? 5,
    });
    setEditing(product);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      ...form,
      price: parseFloat(form.price),
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      low_stock_threshold: parseInt(form.low_stock_threshold) || 5,
    };
    if (editing) {
      await base44.entities.Product.update(editing.id, data);
      toast.success('Məhsul yeniləndi');
    } else {
      await base44.entities.Product.create({ ...data, club_owner_id: clubOwnerId });
      toast.success('Məhsul əlavə edildi');
    }
    queryClient.invalidateQueries({ queryKey: ['products', clubOwnerId] });
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (product) => {
    await base44.entities.Product.delete(product.id);
    queryClient.invalidateQueries({ queryKey: ['products', clubOwnerId] });
    toast.success('Məhsul silindi');
  };

  const handleRestock = async () => {
    if (!restockDialog) return;
    const newQty = (restockDialog.stock_quantity ?? 0) + restockAmount;
    await base44.entities.Product.update(restockDialog.id, {
      stock_quantity: newQty,
      in_stock: newQty > 0,
    });
    queryClient.invalidateQueries({ queryKey: ['products', clubOwnerId] });
    toast.success(`${restockDialog.name}: stok +${restockAmount} əlavə edildi (Cəmi: ${newQty})`);
    setRestockDialog(null);
    setRestockAmount(10);
  };

  const totalProducts = products.length;
  const outOfStock = products.filter(p => (p.stock_quantity ?? 0) === 0 && p.in_stock !== false);
  const lowStock = products.filter(p => {
    const qty = p.stock_quantity ?? 0;
    const threshold = p.low_stock_threshold ?? 5;
    return qty > 0 && qty <= threshold;
  });

  const filtered = useMemo(() => {
    let base = products;
    if (filterTab === 'low') base = lowStock;
    else if (filterTab === 'out') base = outOfStock;
    else if (filterTab !== 'all') base = products.filter(p => p.category === filterTab);

    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      base = base.filter(p => p.name.toLowerCase().includes(q));
    }
    return base;
  }, [products, filterTab, searchQuery, lowStock, outOfStock]);

  const grouped = filtered.reduce((acc, p) => {
    const cat = p.category || 'diger';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Məhsullar</h1>
          <p className="text-sm text-muted-foreground mt-1">Stok idarəsi, alış/satış qiymətləri və mənfəət</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-1.5" /> Əlavə et
        </Button>
      </div>

      {/* Stock Overview Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ümumi</p>
              <p className="text-xl font-bold text-foreground">{totalProducts}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-yellow-500/30 bg-yellow-500/5 cursor-pointer hover:bg-yellow-500/10 transition-colors" onClick={() => setFilterTab(f => f === 'low' ? 'all' : 'low')}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-yellow-600">Az stok</p>
              <p className="text-xl font-bold text-yellow-500">{lowStock.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-destructive/30 bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors" onClick={() => setFilterTab(f => f === 'out' ? 'all' : 'out')}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <PackageX className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-destructive/80">Stokda yox</p>
              <p className="text-xl font-bold text-destructive">{outOfStock.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Məhsul axtar... (2+ hərf)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'Hamısı' },
            { key: 'yemek', label: 'Yemək' },
            { key: 'icki', label: 'İçki' },
            { key: 'atistirmalik', label: 'Atıştırmalıq' },
            { key: 'diger', label: 'Digər' },
            { key: 'low', label: '⚠ Az stok' },
            { key: 'out', label: '✕ Bitib' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterTab(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterTab === f.key
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Groups */}
      {Object.entries(grouped).map(([cat, items]) => {
        const CatIcon = categoryIcons[cat] || Package;
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <CatIcon className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground">{categoryLabels[cat] || cat}</h2>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map(product => {
                const isLow = (product.stock_quantity ?? 0) > 0 && (product.stock_quantity ?? 0) <= (product.low_stock_threshold ?? 5);
                const isOut = (product.stock_quantity ?? 0) === 0 && product.in_stock !== false;
                const margin = calcMargin(product.price, product.purchase_price);
                return (
                  <Card
                    key={product.id}
                    className={`p-4 border transition-colors ${
                      isOut ? 'border-destructive/30 bg-destructive/5'
                        : isLow ? 'border-yellow-500/30 bg-yellow-500/5'
                          : 'border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-primary font-bold text-sm">{product.price.toFixed(2)} ₼</p>
                          {product.purchase_price && (
                            <p className="text-xs text-muted-foreground">alış: {product.purchase_price.toFixed(2)} ₼</p>
                          )}
                        </div>
                        {margin !== null && (
                          <div className="flex items-center gap-1 mt-1">
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-green-500 font-semibold">%{margin} mənfəət</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button size="icon" variant="ghost" className="h-7 w-7" title="Stok əlavə et" onClick={() => { setRestockDialog(product); setRestockAmount(10); }}>
                          <TrendingDown className="w-3 h-3 text-primary rotate-180" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(product)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(product)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <StockBadge product={product} />
                    <div className="mt-2 w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${isOut ? 'w-0' : isLow ? 'bg-yellow-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, ((product.stock_quantity ?? 0) / Math.max(20, (product.stock_quantity ?? 0))) * 100)}%` }}
                      />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Məhsul tapılmadı</p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editing ? 'Məhsulu Düzəlt' : 'Yeni Məhsul'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Ad</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="Məhsul adı" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Kateqoriya</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="yemek">Yemək</SelectItem>
                  <SelectItem value="icki">İçki</SelectItem>
                  <SelectItem value="atistirmalik">Atıştırmalıq</SelectItem>
                  <SelectItem value="diger">Digər</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Alış qiyməti (₼)</Label>
                <Input type="number" step="0.1" value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="0.00" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Satış qiyməti (₼)</Label>
                <Input type="number" step="0.1" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="0.00" />
              </div>
            </div>
            {form.price && form.purchase_price && parseFloat(form.purchase_price) > 0 && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-500 font-semibold">
                  Mənfəət: %{calcMargin(parseFloat(form.price), parseFloat(form.purchase_price))}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Stok miqdarı</Label>
                <Input type="number" min={0} value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))} className="bg-secondary border-border mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Xəbərdarlıq həddi</Label>
                <Input type="number" min={1} value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} className="bg-secondary border-border mt-1" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Stokda var</Label>
              <Switch checked={form.in_stock} onCheckedChange={v => setForm(f => ({ ...f, in_stock: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Ləğv et</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.price} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {editing ? 'Yenilə' : 'Əlavə et'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={!!restockDialog} onOpenChange={(v) => { if (!v) setRestockDialog(null); }}>
        <DialogContent className="bg-card border-border max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary" />
              Stok Artır
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
                <Label className="text-xs text-muted-foreground">Xüsusi miqdar</Label>
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
            <Button onClick={handleRestock} className="bg-primary hover:bg-primary/90 text-primary-foreground">Stok əlavə et</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}