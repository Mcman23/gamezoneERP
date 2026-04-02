import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Coffee, GlassWater, Cookie, Package } from 'lucide-react';
import { toast } from 'sonner';

const categoryLabels = { yemek: 'Yemək', icki: 'İçki', atistirmalik: 'Atıştırmalıq', diger: 'Digər' };
const categoryIcons = { yemek: Coffee, icki: GlassWater, atistirmalik: Cookie, diger: Package };

export default function Products() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'yemek', price: '', in_stock: true });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list(),
  });

  const resetForm = () => {
    setForm({ name: '', category: 'yemek', price: '', in_stock: true });
    setEditing(null);
  };

  const openEdit = (product) => {
    setForm({ name: product.name, category: product.category, price: product.price.toString(), in_stock: product.in_stock !== false });
    setEditing(product);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = { ...form, price: parseFloat(form.price) };
    if (editing) {
      await base44.entities.Product.update(editing.id, data);
      toast.success('Məhsul yeniləndi');
    } else {
      await base44.entities.Product.create(data);
      toast.success('Məhsul əlavə edildi');
    }
    queryClient.invalidateQueries({ queryKey: ['products'] });
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (product) => {
    await base44.entities.Product.delete(product.id);
    queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success('Məhsul silindi');
  };

  const grouped = products.reduce((acc, p) => {
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
          <p className="text-sm text-muted-foreground mt-1">Yemək, içki və atıştırmalıqlar</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-1.5" /> Əlavə et
        </Button>
      </div>

      {Object.entries(grouped).map(([cat, items]) => {
        const Icon = categoryIcons[cat] || Package;
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground">{categoryLabels[cat] || cat}</h2>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map(product => (
                <Card key={product.id} className="p-4 border-border flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">{product.name}</p>
                    <p className="text-primary font-bold text-sm">{product.price.toFixed(2)} ₼</p>
                    {product.in_stock === false && <Badge variant="destructive" className="text-[10px] mt-1">Stokda yox</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(product)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(product)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {products.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <Coffee className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Hələ məhsul yoxdur</p>
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
            <div>
              <Label className="text-xs text-muted-foreground">Qiymət (₼)</Label>
              <Input type="number" step="0.1" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="0.00" />
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
    </div>
  );
}