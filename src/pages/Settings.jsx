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
import { Plus, Pencil, Trash2, Monitor, Gamepad2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'pc', hourly_rate: '', ip_address: '', order_number: 0 });

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => base44.entities.GameTable.list('order_number'),
  });

  const resetForm = () => {
    setForm({ name: '', type: 'pc', hourly_rate: '', ip_address: '', order_number: 0 });
    setEditing(null);
  };

  const openEdit = (table) => {
    setForm({
      name: table.name,
      type: table.type,
      hourly_rate: table.hourly_rate.toString(),
      ip_address: table.ip_address || '',
      order_number: table.order_number || 0,
    });
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
    if (table.status === 'occupied') {
      toast.error('Aktiv masa silinə bilməz');
      return;
    }
    await base44.entities.GameTable.delete(table.id);
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    toast.success('Masa silindi');
  };

  const pcTables = tables.filter(t => t.type === 'pc');
  const psTables = tables.filter(t => t.type === 'playstation');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Tənzimləmələr</h1>
          <p className="text-sm text-muted-foreground mt-1">Masa və cihaz idarəsi</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-1.5" /> Masa əlavə et
        </Button>
      </div>

      {/* PC Tables */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Monitor className="w-4 h-4 text-blue-400" />
          <h2 className="font-semibold text-foreground">Kompüterlər</h2>
          <Badge variant="secondary" className="text-xs">{pcTables.length}</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pcTables.map(table => (
            <Card key={table.id} className="p-4 border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-400/10 flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{table.name}</p>
                    <p className="text-xs text-muted-foreground">{table.hourly_rate} ₼/saat {table.ip_address && `• ${table.ip_address}`}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(table)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(table)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* PS Tables */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Gamepad2 className="w-4 h-4 text-accent" />
          <h2 className="font-semibold text-foreground">PlayStation</h2>
          <Badge variant="secondary" className="text-xs">{psTables.length}</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {psTables.map(table => (
            <Card key={table.id} className="p-4 border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Gamepad2 className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{table.name}</p>
                    <p className="text-xs text-muted-foreground">{table.hourly_rate} ₼/saat {table.ip_address && `• ${table.ip_address}`}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(table)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(table)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editing ? 'Masanı Düzəlt' : 'Yeni Masa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Masa adı</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="PC-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tip</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pc">Kompüter (PC)</SelectItem>
                  <SelectItem value="playstation">PlayStation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Saatlıq qiymət (₼)</Label>
              <Input type="number" step="0.5" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="2.00" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">IP ünvanı (uzaqdan idarə üçün)</Label>
              <Input value={form.ip_address} onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="192.168.1.100" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Sıra nömrəsi</Label>
              <Input type="number" value={form.order_number} onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Ləğv et</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.hourly_rate} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {editing ? 'Yenilə' : 'Əlavə et'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}