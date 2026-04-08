import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Crown, Users, ShieldCheck, UserX, Plus, X, CreditCard, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const PLAN_PRICES = { monthly: 29.99, yearly: 299 };
const PLAN_DAYS = { monthly: 30, yearly: 365 };

export default function OwnerPanel() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [subDialog, setSubDialog] = useState(false);
  const [subForm, setSubForm] = useState({ user_id: '', user_email: '', user_name: '', plan: 'monthly', price: '', note: '' });
  const [savingSub, setSavingSub] = useState(false);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-owner'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: allSubscriptions = [] } = useQuery({
    queryKey: ['all-subscriptions-owner'],
    queryFn: () => base44.entities.Subscription.list('-created_date', 200),
  });

  if (user?.role !== 'owner') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Crown className="w-12 h-12 text-destructive/50" />
        <p className="text-muted-foreground">Bu bölməyə yalnız sistem sahibi daxil ola bilər.</p>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const getActiveSub = (userId) =>
    allSubscriptions.find(s => s.user_id === userId && s.status === 'active' && s.end_date >= today);

  const admins = allUsers.filter(u => u.role === 'admin');
  const regularUsers = allUsers.filter(u => u.role === 'user');

  const handlePromoteToAdmin = async (targetUser) => {
    await base44.entities.User.update(targetUser.id, { role: 'admin' });
    queryClient.invalidateQueries({ queryKey: ['all-users-owner'] });
    toast.success(`${targetUser.full_name} Admin roluna yüksəldildi`);
  };

  const handleDemoteToUser = async (targetUser) => {
    await base44.entities.User.update(targetUser.id, { role: 'user' });
    queryClient.invalidateQueries({ queryKey: ['all-users-owner'] });
    toast.success(`${targetUser.full_name} User roluna endirilib`);
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
    queryClient.invalidateQueries({ queryKey: ['all-subscriptions-owner'] });
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    toast.success('Abunəlik aktivləşdirildi');
    setSavingSub(false);
    setSubDialog(false);
  };

  const handleCancelSub = async (sub) => {
    await base44.entities.Subscription.update(sub.id, { status: 'cancelled' });
    queryClient.invalidateQueries({ queryKey: ['all-subscriptions-owner'] });
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    toast.success('Abunəlik ləğv edildi');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Crown className="w-7 h-7 text-primary" /> Owner Panel
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Sistem səviyyəli idarəetmə</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 border-border text-center">
          <p className="text-2xl font-bold text-primary">{allUsers.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Ümumi İstifadəçi</p>
        </Card>
        <Card className="p-4 border-border text-center">
          <p className="text-2xl font-bold text-accent">{admins.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Admin</p>
        </Card>
        <Card className="p-4 border-border text-center">
          <p className="text-2xl font-bold text-green-400">
            {allSubscriptions.filter(s => s.status === 'active' && s.end_date >= today).length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Aktiv Abunəlik</p>
        </Card>
      </div>

      {/* Subscription Management */}
      <Card className="border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" /> Abunəlik İdarəetməsi
          </h3>
          <Button size="sm" onClick={() => { setSubForm({ user_id: '', user_email: '', user_name: '', plan: 'monthly', price: '', note: '' }); setSubDialog(true); }} className="gap-1 text-xs">
            <Plus className="w-3.5 h-3.5" /> Abunəlik əlavə et
          </Button>
        </div>
        <div className="space-y-2">
          {allSubscriptions.length === 0 && <p className="text-sm text-muted-foreground">Hələ abunəlik yoxdur</p>}
          {allSubscriptions.map(sub => {
            const isActive = sub.status === 'active' && sub.end_date >= today;
            return (
              <div key={sub.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-secondary/30">
                <div>
                  <p className="font-medium text-foreground text-sm">{sub.user_name || sub.user_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {sub.plan === 'monthly' ? 'Aylıq' : 'İllik'} • {sub.start_date} → {sub.end_date} • {sub.price} AZN
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                    {isActive ? 'AKTİV' : sub.status === 'cancelled' ? 'LƏĞVEDİLMİŞ' : 'BİTİB'}
                  </Badge>
                  {isActive && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleCancelSub(sub)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Admin Management */}
      <Card className="border-border p-5">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-accent" /> Admin İstifadəçilər ({admins.length})
        </h3>
        <div className="space-y-2">
          {admins.length === 0 && <p className="text-sm text-muted-foreground">Heç bir admin yoxdur</p>}
          {admins.map(u => {
            const sub = getActiveSub(u.id);
            return (
              <div key={u.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-secondary/30">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground text-sm">{u.full_name}</p>
                    {sub ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <X className="w-3.5 h-3.5 text-destructive" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{u.email} • {sub ? `Abunəlik: ${sub.end_date}` : 'Abunəlik yoxdur'}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleDemoteToUser(u)} className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <UserX className="w-3 h-3" /> Endır
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Regular Users — promote to admin */}
      <Card className="border-border p-5">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-muted-foreground" /> İstifadəçilər — Admin Təyin Et ({regularUsers.length})
        </h3>
        <div className="space-y-2">
          {regularUsers.length === 0 && <p className="text-sm text-muted-foreground">İstifadəçi yoxdur</p>}
          {regularUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-secondary/30">
              <div>
                <p className="font-medium text-foreground text-sm">{u.full_name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => handlePromoteToAdmin(u)} className="h-7 text-xs gap-1">
                <ShieldCheck className="w-3 h-3" /> Admin et
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Add Subscription Dialog */}
      <Dialog open={subDialog} onOpenChange={setSubDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Abunəlik Əlavə Et
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Admin seç</Label>
              <Select value={subForm.user_id} onValueChange={v => {
                const u = allUsers.find(u => u.id === v);
                setSubForm(f => ({ ...f, user_id: v, user_email: u?.email || '', user_name: u?.full_name || '' }));
              }}>
                <SelectTrigger className="bg-secondary border-border mt-1">
                  <SelectValue placeholder="İstifadəçi seç..." />
                </SelectTrigger>
                <SelectContent>
                  {allUsers.filter(u => u.role === 'admin').map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
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
            <Button onClick={handleAddSubscription} disabled={!subForm.user_id || savingSub} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {savingSub ? 'Saxlanır...' : 'Aktivləşdir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}