import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Users, Link2, Unlink, Trash2, UserPlus, Phone, Mail, AlertTriangle, RefreshCw } from 'lucide-react';
import CashierSetupNote from '@/components/settings/CashierSetupNote';
import { toast } from 'sonner';

export default function CashierManagement({ user, clubOwnerId }) {
  const queryClient = useQueryClient();
  const [inviteDialog, setInviteDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', phone: '' });

  const { data: allUsers = [], isLoading, refetch } = useQuery({
    queryKey: ['all-users', clubOwnerId],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const linkedCashiers = allUsers.filter(u => u.role === 'user' && u.club_owner_id === clubOwnerId);
  const unlinkedCashiers = allUsers.filter(u => u.role === 'user' && !u.club_owner_id);

  const resetForm = () => setForm({ email: '', phone: '' });

  const handleInvite = async () => {
    if (loading) return;
    if (!form.email.trim()) { toast.error('Email məcburidir'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('Email formatı yanlışdır');
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('createCashier', {
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        club_owner_id: clubOwnerId,
      });
      const data = res.data;
      queryClient.invalidateQueries({ queryKey: ['all-users', clubOwnerId] });
      resetForm();
      setInviteDialog(false);

      if (data?.existing) {
        toast.success('Mövcud istifadəçi kassir kimi kluba bağlandı');
      } else {
        toast.success('Kassir yaradıldı və kluba əlavə edildi');
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e.message || 'Xəta baş verdi';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (cashierUser) => {
    try {
      await base44.functions.invoke('updateUserRole', {
        target_user_id: cashierUser.id,
        role: 'user',
        club_owner_id: clubOwnerId,
      });
      queryClient.invalidateQueries({ queryKey: ['all-users', clubOwnerId] });
      toast.success(`${cashierUser.full_name || cashierUser.email} kluba əlavə edildi`);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    }
  };

  const handleUnlink = async (cashierUser) => {
    try {
      await base44.functions.invoke('updateUserRole', {
        target_user_id: cashierUser.id,
        role: 'user',
        club_owner_id: '',
      });
      queryClient.invalidateQueries({ queryKey: ['all-users', clubOwnerId] });
      toast.success(`${cashierUser.full_name || cashierUser.email} klubdan çıxarıldı`);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await base44.functions.invoke('deleteCashier', { target_user_id: deleteDialog.id });
      queryClient.invalidateQueries({ queryKey: ['all-users', clubOwnerId] });
      toast.success(`${deleteDialog.full_name || deleteDialog.email} silindi`);
      setDeleteDialog(null);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-20">
      <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Kassir İdarəsi</h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="h-8 w-8 p-0">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={() => { resetForm(); setInviteDialog(true); }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs"
          >
            <UserPlus className="w-3.5 h-3.5" /> Kassir dəvət et
          </Button>
        </div>
      </div>

      <CashierSetupNote />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Linked cashiers */}
        <Card className="p-4 border-border">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            Kluba bağlı kassirlər ({linkedCashiers.length})
          </p>
          {linkedCashiers.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Hələ kassir əlavə edilməyib</p>
          ) : (
            <div className="space-y-2">
              {linkedCashiers.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    {c.user_code && <span className="text-[10px] text-green-400 font-mono">#{c.user_code}</span>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-orange-400 hover:bg-orange-400/10" title="Klubdan çıxar" onClick={() => handleUnlink(c)}>
                      <Unlink className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" title="Sil" onClick={() => setDeleteDialog(c)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Unlinked cashiers */}
        <Card className="p-4 border-border">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            Bağlanmamış istifadəçilər ({unlinkedCashiers.length})
          </p>
          {unlinkedCashiers.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Hamısı klublara bağlıdır</p>
          ) : (
            <div className="space-y-2">
              {unlinkedCashiers.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2.5 border border-border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => handleLink(c)}>
                      <Link2 className="w-3 h-3" /> Əlavə et
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => setDeleteDialog(c)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteDialog} onOpenChange={(v) => { setInviteDialog(v); if (!v) resetForm(); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" /> Kassir Dəvət Et
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Email daxil edin. İstifadəçi mövcuddursa dərhal kluba bağlanacaq, yoxdursa ona dəvət göndəriləcək.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2" onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) handleInvite();
          }}>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Mail className="w-3 h-3" /> Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="bg-secondary border-border"
                placeholder="kassir@email.com"
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Phone className="w-3 h-3" /> Telefon <span className="text-muted-foreground">(istəyə bağlı)</span>
              </Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="bg-secondary border-border"
                placeholder="050xxxxxxx"
              />
            </div>

            <div className="bg-secondary border border-border rounded-lg p-3 text-xs text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground">Necə işləyir:</p>
              <div className="flex items-start gap-2"><span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">1</span><span>Admin kassirin emailini daxil edir</span></div>
              <div className="flex items-start gap-2"><span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">2</span><span>İstifadəçi varsa dərhal kluba bağlanır, yoxdursa dəvət göndərilir</span></div>
              <div className="flex items-start gap-2"><span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">3</span><span>Kassir ilk girişdə hesabını tamamlayır</span></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setInviteDialog(false); resetForm(); }}>Ləğv et</Button>
            <Button
              onClick={handleInvite}
              disabled={loading || !form.email.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Göndərilir...
                </span>
              ) : 'Göndər'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="bg-card border-destructive/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> İstifadəçini Sil
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <strong className="text-foreground">{deleteDialog?.full_name || deleteDialog?.email}</strong> sistemdən tamamilə silinəcək. Bu əməliyyat geri qaytarıla bilməz.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Ləğv et</Button>
            <Button variant="destructive" onClick={handleDelete}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}