import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, Link2, Unlink, Trash2, UserPlus, Phone, Mail, AlertTriangle, RefreshCw, CheckCircle, Clock } from 'lucide-react';
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

  // Users linked to this club
  const linkedCashiers = allUsers.filter(
    u => u.role === 'user' && u.club_owner_id === clubOwnerId
  );

  // Users not linked to any club (available to add)
  const unlinkedCashiers = allUsers.filter(
    u => u.role === 'user' && !u.club_owner_id
  );

  const resetForm = () => setForm({ email: '', phone: '' });

  const handleInvite = async () => {
    if (!form.email.trim()) { toast.error('Email məcburidir'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error('Email formatı yanlışdır');
      return;
    }

    setLoading(true);
    try {
      const res = await base44.functions.invoke('inviteCashier', {
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        club_owner_id: clubOwnerId,
      });

      const data = res.data;

      queryClient.invalidateQueries({ queryKey: ['all-users', clubOwnerId] });
      resetForm();
      setInviteDialog(false);

      if (data?.existing) {
        toast.success('Mövcud istifadəçi kluba bağlandı');
      } else {
        toast.success('Dəvət emaili göndərildi! Kassir emaildəki linkə klikləyib qeydiyyatı tamamlamalıdır.');
      }
    } catch (e) {
      let msg = e?.response?.data?.error || e.message || 'Xəta baş verdi';
      if (msg.includes('Disposable email')) msg = 'Etibarsız email. Real email ünvanı daxil edin.';
      if (msg.includes('already')) msg = 'Bu email artıq sistemdə qeydiyyatdadır.';
      toast.error(msg);
    }
    setLoading(false);
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
      await base44.functions.invoke('deleteCashier', {
        target_user_id: deleteDialog.id,
      });
      queryClient.invalidateQueries({ queryKey: ['all-users', clubOwnerId] });
      toast.success(`${deleteDialog.full_name || deleteDialog.email} sistemdən silindi`);
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

      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-foreground">Kassir əlavə etmə qaydası:</strong> Email daxil edin → kassir dəvət emaili alacaq → linki klikləyib şifrəsini özü təyin edəcək → sistem avtomatik bağlayacaq.
        </div>
      </div>

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
                    {c.user_code && (
                      <span className="text-[10px] text-green-400 font-mono">#{c.user_code}</span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-orange-400 hover:bg-orange-400/10" title="Klubdan çıxar" onClick={() => handleUnlink(c)}>
                      <Unlink className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" title="Sistemdən sil" onClick={() => setDeleteDialog(c)}>
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
            Qeydiyyatlı, bağlanmamış istifadəçilər ({unlinkedCashiers.length})
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
              Kassirin emailini daxil edin. Ona dəvət emaili göndəriləcək — kassir linkə klikləyib öz şifrəsini təyin edəcək.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
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

            {/* How it works */}
            <div className="bg-secondary rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-medium text-foreground">Necə işləyir:</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">1</span>
                Kassirə dəvət emaili göndərilir
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</span>
                Kassir emaildəki linki klikləyib şifrəsini özü təyin edir
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0">3</span>
                Hesab aktivləşir, kassir sisteme daxil ola bilir
              </div>
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
              ) : 'Dəvət göndər'}
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