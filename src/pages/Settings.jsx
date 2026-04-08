import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Monitor, Gamepad2, Tv2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_TABLES, CATEGORY_LABELS, getPsRate } from '@/lib/tableConfig';

const catIcons = { computer: Monitor, playstation: Gamepad2, cabinet: Gamepad2, simulator: Tv2 };

export default function Settings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '', category: 'computer', zone: 'hall', ps_model: 'none', hourly_rate: '', ip_address: '', order_number: 0 });

  const { data: tables = [] } = useQuery({ queryKey: ['tables'], queryFn: () => base44.entities.GameTable.list('order_number') });

  const resetForm = () => { setForm({ name: '', code: '', category: 'computer', zone: 'hall', ps_model: 'none', hourly_rate: '', ip_address: '', order_number: 0 }); setEditing(null); };

  const openEdit = (table) => {
    setForm({ name: table.name, code: table.code || '', category: table.category, zone: table.zone || 'hall', ps_model: table.ps_model || 'none', hourly_rate: table.hourly_rate.toString(), ip_address: table.ip_address || '', order_number: table.order_number || 0 });
    setEditing(table);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = { ...form, hourly_rate: parseFloat(form.hourly_rate), order_number: parseInt(form.order_number) || 0 };
    if (editing) {
      await base44.entities.GameTable.update(editing.id, data);
      toast.success('Masa yeniləndi');
    } else {
      data.status = 'available';
      await base44.entities.GameTable.create(data);
      toast.success('Masa əlavə edildi');
    }
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (table) => {
    if (table.status === 'occupied') { toast.error('Aktiv masa silinə bilməz'); return; }
    await base44.entities.GameTable.delete(table.id);
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    toast.success('Masa silindi');
  };

  const autoCreateTables = async () => {
    if (tables.length > 0) { toast.error('Artıq masalar mövcuddur. Əvvəl silin.'); return; }
    await base44.entities.GameTable.bulkCreate(DEFAULT_TABLES.map(t => ({ ...t, status: 'available' })));
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    toast.success(`${DEFAULT_TABLES.length} masa avtomatik yaradıldı`);
  };

  // Auto-update hourly rate when PS model/zone changes
  const handlePsChange = (field, value) => {
    const newForm = { ...form, [field]: value };
    if ((newForm.category === 'playstation' || newForm.category === 'cabinet') && newForm.ps_model !== 'none') {
      newForm.hourly_rate = getPsRate(newForm.ps_model, newForm.zone).toString();
    }
    setForm(newForm);
  };

  const grouped = {};
  ['computer', 'playstation', 'cabinet', 'simulator'].forEach(cat => { grouped[cat] = tables.filter(t => t.category === cat); });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Tənzimləmələr</h1>
          <p className="text-sm text-muted-foreground mt-1">Masa və cihaz idarəsi</p>
        </div>
        <div className="flex gap-2">
          {tables.length === 0 && (
            <Button variant="outline" onClick={autoCreateTables} className="gap-2">
              <Zap className="w-4 h-4" /> Avtomatik yarat
            </Button>
          )}
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-1.5" /> Masa əlavə et
          </Button>
        </div>
      </div>

      {Object.entries(grouped).map(([cat, items]) => {
        if (items.length === 0) return null;
        const Icon = catIcons[cat] || Monitor;
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold text-foreground">{CATEGORY_LABELS[cat]}</h2>
              <Badge variant="secondary" className="text-xs">{items.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map(table => (
                <Card key={table.id} className="p-4 border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{table.name}</p>
                        <p className="text-xs text-muted-foreground">{table.code} • {table.hourly_rate} ₼/saat {table.ps_model !== 'none' && `• ${table.ps_model?.toUpperCase()}`}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(table)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(table)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editing ? 'Masanı Düzəlt' : 'Yeni Masa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Masa adı</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="Gamezone 1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Kod</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="PC1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Kateqoriya</Label>
              <Select value={form.category} onValueChange={v => handlePsChange('category', v)}>
                <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="computer">Kompüter (PC)</SelectItem>
                  <SelectItem value="playstation">PlayStation (Zal)</SelectItem>
                  <SelectItem value="cabinet">PlayStation (Kabinet)</SelectItem>
                  <SelectItem value="simulator">Simulator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(form.category === 'playstation' || form.category === 'cabinet') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">PS Modeli</Label>
                  <Select value={form.ps_model} onValueChange={v => handlePsChange('ps_model', v)}>
                    <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ps3">PS3</SelectItem>
                      <SelectItem value="ps4">PS4</SelectItem>
                      <SelectItem value="ps5">PS5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Zona</Label>
                  <Select value={form.zone} onValueChange={v => handlePsChange('zone', v)}>
                    <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hall">Zal</SelectItem>
                      <SelectItem value="cabinet">Kabinet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Saatlıq (₼)</Label>
                <Input type="number" step="0.5" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} className="bg-secondary border-border mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Sıra</Label>
                <Input type="number" value={form.order_number} onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))} className="bg-secondary border-border mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">IP ünvanı</Label>
              <Input value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="192.168.1.100" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Ləğv et</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.hourly_rate} className="bg-primary hover:bg-primary/90 text-primary-foreground">{editing ? 'Yenilə' : 'Əlavə et'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}