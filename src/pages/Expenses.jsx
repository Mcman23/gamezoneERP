import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useClub } from '@/hooks/useClub';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, DollarSign, Pencil, Paperclip, X } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { EXPENSE_CATEGORIES } from '@/lib/tableConfig';

const defaultForm = { title: '', category: 'other', amount: '', date: format(new Date(), 'yyyy-MM-dd'), note: '', payment_method: 'cash', file_url: '' };

export default function Expenses() {
  const { user } = useOutletContext();
  const { clubOwnerId } = useClub(user);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [filterCat, setFilterCat] = useState('all');

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', clubOwnerId],
    queryFn: () => clubOwnerId ? base44.entities.Expense.filter({ club_owner_id: clubOwnerId }, '-created_date', 500) : [],
    enabled: !!clubOwnerId,
  });

  const resetForm = () => { setForm(defaultForm); setEditing(null); };

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, file_url }));
    setUploading(false);
    toast.success('Fayl yükləndi');
  };

  const handleSave = async () => {
    const data = { ...form, amount: parseFloat(form.amount) };
    if (editing) {
      await base44.entities.Expense.update(editing.id, data);
      toast.success('Xərc yeniləndi');
    } else {
      await base44.entities.Expense.create({ ...data, club_owner_id: clubOwnerId });
      toast.success('Xərc əlavə edildi');
    }
    queryClient.invalidateQueries({ queryKey: ['expenses', clubOwnerId] });
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (expense) => {
    await base44.entities.Expense.delete(expense.id);
    queryClient.invalidateQueries({ queryKey: ['expenses', clubOwnerId] });
    toast.success('Xərc silindi');
  };

  const monthInterval = useMemo(() => {
    const now = new Date();
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }, []);

  const monthlyExpenses = useMemo(() => {
    return expenses.filter(e => {
      try { return isWithinInterval(new Date(e.date || e.created_date), monthInterval); } catch { return false; }
    });
  }, [expenses, monthInterval]);

  const monthlyTotal = monthlyExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const filtered = filterCat === 'all' ? expenses : expenses.filter(e => e.category === filterCat);

  const byCat = useMemo(() => {
    const map = {};
    monthlyExpenses.forEach(e => {
      if (!map[e.category]) map[e.category] = 0;
      map[e.category] += e.amount || 0;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthlyExpenses]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Xərclər</h1>
          <p className="text-sm text-muted-foreground mt-1">Bu ay: {monthlyTotal.toFixed(2)} ₼</p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-1.5" /> Xərc əlavə et
        </Button>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {byCat.slice(0, 4).map(([cat, total]) => (
          <Card key={cat} className="p-4 border-border">
            <p className={`text-xs font-medium ${EXPENSE_CATEGORIES[cat]?.color || 'text-muted-foreground'}`}>{EXPENSE_CATEGORIES[cat]?.label || cat}</p>
            <p className="text-xl font-bold text-foreground mt-1">{total.toFixed(2)} ₼</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterCat('all')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCat === 'all' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground'}`}>Hamısı</button>
        {Object.entries(EXPENSE_CATEGORIES).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterCat(key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCat === key ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground'}`}>{cfg.label}</button>
        ))}
      </div>

      {/* Expense list */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-left p-4 text-xs font-medium text-muted-foreground">Başlıq</th>
                <th className="text-center p-4 text-xs font-medium text-muted-foreground">Kateqoriya</th>
                <th className="text-center p-4 text-xs font-medium text-muted-foreground">Tarix</th>
                <th className="text-center p-4 text-xs font-medium text-muted-foreground">Məbləğ</th>
                <th className="text-center p-4 text-xs font-medium text-muted-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((expense, i) => (
                <tr key={expense.id} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-secondary/10'} hover:bg-secondary/20 transition-colors`}>
                  <td className="p-4 text-sm font-medium text-foreground">{expense.title}</td>
                  <td className="p-4 text-center">
                    <Badge variant="secondary" className="text-xs">{EXPENSE_CATEGORIES[expense.category]?.label || expense.category}</Badge>
                  </td>
                  <td className="p-4 text-center text-sm text-muted-foreground">{expense.date ? format(new Date(expense.date), 'dd/MM/yyyy') : ''}</td>
                  <td className="p-4 text-center text-sm font-bold text-destructive">{(expense.amount || 0).toFixed(2)} ₼</td>
                  <td className="p-4 text-center">
                    <div className="flex gap-1 justify-center">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setForm({ title: expense.title, category: expense.category, amount: expense.amount.toString(), date: expense.date || '', note: expense.note || '', payment_method: expense.payment_method || 'cash' }); setEditing(expense); setDialogOpen(true); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(expense)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12"><p className="text-muted-foreground text-sm">Xərc tapılmadı</p></div>}
        </div>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editing ? 'Xərci Düzəlt' : 'Yeni Xərc'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Başlıq</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="Xərc başlığı" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Kateqoriya</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(EXPENSE_CATEGORIES).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Məbləğ (₼)</Label>
                <Input type="number" step="0.5" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="bg-secondary border-border mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tarix</Label>
                <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="bg-secondary border-border mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Qeyd</Label>
              <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="İstəyə bağlı" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" /> Qaimə / Faktura</Label>
              {form.file_url ? (
                <div className="mt-1 flex items-center gap-2 bg-secondary rounded-lg p-2">
                  <a href={form.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline flex-1 truncate">Fayl yüklənib</a>
                  <button onClick={() => setForm(f => ({ ...f, file_url: '' }))} className="text-muted-foreground hover:text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className={`mt-1 flex items-center gap-2 border border-dashed border-border rounded-lg p-3 cursor-pointer hover:border-primary/40 transition-colors ${uploading ? 'opacity-50' : ''}`}>
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{uploading ? 'Yüklənir...' : 'Fayl seç (şəkil, PDF...)'}</span>
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Ləğv et</Button>
            <Button onClick={handleSave} disabled={!form.title || !form.amount} className="bg-primary hover:bg-primary/90 text-primary-foreground">{editing ? 'Yenilə' : 'Əlavə et'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}