import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldAlert, Trash2, AlertTriangle, Database, Clock, ShoppingCart, CalendarDays, Monitor, Lock, Unlock, PowerOff, RotateCcw, Activity, Crown, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { useClub } from '@/hooks/useClub';

const CONFIRM_TEXT = 'BÜTÜN MƏLUMATLARI SİL';

const PLAN_PRICES = { monthly: 29.99, yearly: 299 };
const PLAN_DAYS = { monthly: 30, yearly: 365 };

export default function AdminPanel() {
  const { user } = useOutletContext();
  const { clubOwnerId } = useClub(user);
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [step, setStep] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [subDialog, setSubDialog] = useState(false);
  const [subForm, setSubForm] = useState({ user_id: '', user_email: '', user_name: '', plan: 'monthly', price: '', note: '' });
  const [savingSub, setSavingSub] = useState(false);

  const { data: sessions = [] } = useQuery({ queryKey: ['all-sessions-admin', clubOwnerId], queryFn: () => clubOwnerId ? base44.entities.Session.filter({ club_owner_id: clubOwnerId }) : [], enabled: !!clubOwnerId });
  const { data: allSubscriptions = [] } = useQuery({ queryKey: ['all-subscriptions'], queryFn: () => base44.entities.Subscription.list('-created_date', 100) });
  const { data: allUsers = [] } = useQuery({ queryKey: ['all-users-admin'], queryFn: () => base44.entities.User.list() });
  const { data: orders = [] } = useQuery({ queryKey: ['all-orders-admin', clubOwnerId], queryFn: () => clubOwnerId ? base44.entities.Order.filter({ club_owner_id: clubOwnerId }) : [], enabled: !!clubOwnerId });
  const { data: tables = [] } = useQuery({ queryKey: ['tables', clubOwnerId], queryFn: () => clubOwnerId ? base44.entities.GameTable.filter({ club_owner_id: clubOwnerId }) : [], enabled: !!clubOwnerId });
  const { data: expenses = [] } = useQuery({ queryKey: ['expenses-admin', clubOwnerId], queryFn: () => clubOwnerId ? base44.entities.Expense.filter({ club_owner_id: clubOwnerId }) : [], enabled: !!clubOwnerId });
  const { data: activeSessions = [] } = useQuery({ queryKey: ['active-sessions', clubOwnerId], queryFn: () => clubOwnerId ? base44.entities.Session.filter({ status: 'active', club_owner_id: clubOwnerId }) : [], enabled: !!clubOwnerId });

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

  const handleAddSubscription = async () => {
    setSavingSub(true);
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + PLAN_DAYS[subForm.plan] * 86400000).toISOString().split('T')[0];
    await base44.entities.Subscription.create({
      user_id: subForm.user_id,
      user_email: subForm.user_email,
      user_name: subForm.user_name,
      plan: subForm.plan,
      status: 'active',
      start_date: start,
      end_date: end,
      price: parseFloat(subForm.price) || PLAN_PRICES[subForm.plan],
      note: subForm.note,
    });
    queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    toast.success('Abunəlik aktivləşdirildi');
    setSavingSub(false);
    setSubDialog(false);
  };

  const handleCancelSub = async (sub) => {
    await base44.entities.Subscription.update(sub.id, { status: 'cancelled' });
    queryClient.invalidateQueries({ queryKey: ['all-subscriptions'] });
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    toast.success('Abunəlik ləğv edildi');
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

      {/* Subscription Management */}
      <Card className="border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2"><Crown className="w-4 h-4 text-primary" /> Abunəlik İdarəetməsi</h3>
          <Button size="sm" onClick={() => { setSubForm({ user_id: '', user_email: '', user_name: '', plan: 'monthly', price: '', note: '' }); setSubDialog(true); }} className="gap-1 text-xs">
            <Plus className="w-3.5 h-3.5" /> Abunəlik əlavə et
          </Button>
        </div>
        <div className="space-y-2">
          {allSubscriptions.length === 0 && <p className="text-sm text-muted-foreground">Hələ abunəlik yoxdur</p>}
          {allSubscriptions.map(sub => {
            const today = new Date().toISOString().split('T')[0];
            const isActive = sub.status === 'active' && sub.end_date >= today;
            return (
              <div key={sub.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-secondary/30">
                <div>
                  <p className="font-medium text-foreground text-sm">{sub.user_name || sub.user_email}</p>
                  <p className="text-xs text-muted-foreground">{sub.plan === 'monthly' ? 'Aylıq' : 'İllik'} • {sub.end_date} qədər</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">{isActive ? 'AKTİV' : sub.status === 'cancelled' ? 'LƏĞVEDİLMİŞ' : 'BİTİB'}</Badge>
                  {isActive && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleCancelSub(sub)}><X className="w-3.5 h-3.5" /></Button>}
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

      {/* Add Subscription Dialog */}
      <Dialog open={subDialog} onOpenChange={setSubDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader><DialogTitle className="text-foreground flex items-center gap-2"><Crown className="w-4 h-4 text-primary" /> Abunəlik Əlavə Et</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">İstifadəçi seç</Label>
              <Select value={subForm.user_id} onValueChange={v => {
                const u = allUsers.find(u => u.id === v);
                setSubForm(f => ({ ...f, user_id: v, user_email: u?.email || '', user_name: u?.full_name || '' }));
              }}>
                <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue placeholder="İstifadəçi..." /></SelectTrigger>
                <SelectContent>{allUsers.filter(u => u.role === 'admin').map(u => <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.email})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Plan</Label>
              <Select value={subForm.plan} onValueChange={v => setSubForm(f => ({ ...f, plan: v, price: String(PLAN_PRICES[v]) }))}>
                <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Aylıq — 29.99 AZN</SelectItem>
                  <SelectItem value="yearly">İllik — 299 AZN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Məbləğ (AZN)</Label>
              <Input type="number" value={subForm.price} onChange={e => setSubForm(f => ({ ...f, price: e.target.value }))} placeholder={String(PLAN_PRICES[subForm.plan])} className="bg-secondary border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Qeyd</Label>
              <Input value={subForm.note} onChange={e => setSubForm(f => ({ ...f, note: e.target.value }))} placeholder="İstəyə bağlı" className="bg-secondary border-border mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialog(false)}>Ləğv et</Button>
            <Button onClick={handleAddSubscription} disabled={!subForm.user_id || savingSub} className="bg-primary hover:bg-primary/90 text-primary-foreground">{savingSub ? 'Saxlanır...' : 'Aktivləşdir'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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