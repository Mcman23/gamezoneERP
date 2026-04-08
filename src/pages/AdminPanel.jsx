import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldAlert, Trash2, AlertTriangle, Database, Clock, ShoppingCart, CalendarDays, Monitor, Lock, Unlock, PowerOff, RotateCcw, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';

const CONFIRM_TEXT = 'BÜTÜN MƏLUMATLARI SİL';

export default function AdminPanel() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [step, setStep] = useState(1);
  const [deleting, setDeleting] = useState(false);

  const { data: sessions = [] } = useQuery({ queryKey: ['all-sessions-admin'], queryFn: () => base44.entities.Session.list() });
  const { data: orders = [] } = useQuery({ queryKey: ['all-orders-admin'], queryFn: () => base44.entities.Order.list() });
  const { data: tables = [] } = useQuery({ queryKey: ['tables'], queryFn: () => base44.entities.GameTable.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses-admin'], queryFn: () => base44.entities.Expense.list() });
  const { data: activeSessions = [] } = useQuery({ queryKey: ['active-sessions'], queryFn: () => base44.entities.Session.filter({ status: 'active' }) });

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="w-12 h-12 text-destructive/50" />
        <p className="text-muted-foreground">Bu bölməyə yalnız administratorlar daxil ola bilər.</p>
      </div>
    );
  }

  const handleDeleteAll = async () => {
    if (confirmInput !== CONFIRM_TEXT) { toast.error('Təsdiq mətni yanlışdır'); return; }
    setDeleting(true);
    try {
      await Promise.all(sessions.map(s => base44.entities.Session.delete(s.id)));
      await Promise.all(orders.map(o => base44.entities.Order.delete(o.id)));
      await Promise.all(expenses.map(e => base44.entities.Expense.delete(e.id)));
      await Promise.all(tables.map(t => base44.entities.GameTable.update(t.id, { status: 'available', current_session_id: '' })));
      queryClient.invalidateQueries();
      toast.success('Bütün məlumatlar silindi');
    } catch (err) { toast.error('Xəta: ' + err.message); }
    setDeleting(false);
    setDeleteDialog(false);
    setConfirmInput('');
    setStep(1);
  };

  const handleTableAction = async (table, action) => {
    if (action === 'lock') {
      if (table.status === 'occupied') { toast.error('Aktiv masa kilidlənə bilməz'); return; }
      await base44.entities.GameTable.update(table.id, { status: 'locked' });
      toast.success(`${table.name} kilidləndi`);
    } else if (action === 'unlock') {
      await base44.entities.GameTable.update(table.id, { status: 'available' });
      toast.success(`${table.name} açıldı`);
    } else if (action === 'shutdown') {
      if (table.status === 'occupied') { toast.error('Aktiv sessiyanı əvvəl bağlayın'); return; }
      await base44.entities.GameTable.update(table.id, { status: 'offline' });
      toast.success(`${table.name} söndürüldü`);
    }
    queryClient.invalidateQueries({ queryKey: ['tables'] });
  };

  const dataStats = [
    { label: 'Sessiyalar', count: sessions.length, icon: Clock, color: 'text-primary' },
    { label: 'Sifarişlər', count: orders.length, icon: ShoppingCart, color: 'text-accent' },
    { label: 'Xərclər', count: expenses.length, icon: Database, color: 'text-green-400' },
    { label: 'Masalar', count: tables.length, icon: Monitor, color: 'text-yellow-400' },
    { label: 'Aktiv', count: activeSessions.length, icon: Activity, color: 'text-blue-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-primary" /> Admin Panel
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Sistem idarəsi və uzaqdan nəzarət</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {dataStats.map(stat => (
          <Card key={stat.label} className="p-4 border-border">
            <div className="flex flex-col items-center gap-2 text-center">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
              <p className="text-2xl font-bold text-foreground">{stat.count}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Remote table control */}
      <Card className="border-border p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><Monitor className="w-4 h-4 text-primary" /> Masa İdarəetməsi</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tables.map(table => {
            const isLocked = table.status === 'locked' || table.status === 'offline';
            return (
              <div key={table.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-secondary/30">
                <div>
                  <p className="font-medium text-foreground text-sm">{table.name}</p>
                  <Badge variant={table.status === 'occupied' ? 'default' : table.status === 'locked' ? 'destructive' : 'secondary'} className="text-[10px] mt-1">
                    {table.status === 'available' ? 'BOŞ' : table.status === 'occupied' ? 'AKTİV' : table.status === 'locked' ? 'KİLİDLİ' : 'OFFLINE'}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  {isLocked ? (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => handleTableAction(table, 'unlock')}><Unlock className="w-4 h-4" /></Button>
                  ) : (
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-orange-400" onClick={() => handleTableAction(table, 'lock')}><Lock className="w-4 h-4" /></Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleTableAction(table, 'shutdown')}><PowerOff className="w-4 h-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
          <div>
            <h3 className="font-bold text-destructive">Təhlükəli Zona</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Geri qaytarılmaz əməliyyatlar</p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={() => { setDeleteDialog(true); setStep(1); setConfirmInput(''); }} className="gap-2">
          <Trash2 className="w-4 h-4" /> Bütün məlumatları sil
        </Button>
      </Card>

      <Dialog open={deleteDialog} onOpenChange={(v) => { if (!deleting) { setDeleteDialog(v); setStep(1); setConfirmInput(''); } }}>
        <DialogContent className="bg-card border-destructive/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> {step < 3 ? 'Əminsiniz?' : 'Təsdiq'}</DialogTitle>
          </DialogHeader>
          {step === 1 && <p className="text-sm text-muted-foreground py-2">Bu əməliyyat <strong className="text-destructive">{sessions.length} sessiya</strong>, <strong className="text-destructive">{orders.length} sifariş</strong> və <strong className="text-destructive">{expenses.length} xərc</strong> silir.</p>}
          {step === 2 && <p className="text-sm text-destructive py-2">⚠ Son xəbərdarlıq! Davam etmək istəyirsiniz?</p>}
          {step === 3 && (
            <div className="space-y-3 py-2">
              <p className="text-xs font-mono text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{CONFIRM_TEXT}</p>
              <Input value={confirmInput} onChange={e => setConfirmInput(e.target.value)} placeholder="Mətni daxil edin..." className="bg-secondary border-destructive/30" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialog(false); setStep(1); }} disabled={deleting}>Ləğv et</Button>
            {step < 3 ? <Button variant="destructive" onClick={() => setStep(s => s + 1)}>Davam et</Button> :
              <Button variant="destructive" onClick={handleDeleteAll} disabled={confirmInput !== CONFIRM_TEXT || deleting}>{deleting ? 'Silinir...' : 'Sil'}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}