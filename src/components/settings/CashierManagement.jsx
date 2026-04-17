import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Users, Plus, Link2, Unlink, Trash2, UserPlus, Phone, Mail, User, AlertTriangle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function CashierManagement({ user, clubOwnerId }) {
  const queryClient = useQueryClient();
  const [inviteDialog, setInviteDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null); // user object
  const [loading, setLoading] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null); // { password, email }
  const [form, setForm] = useState({ full_name: '', email: '', phone: '' });

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  // Cashiers linked to this admin's club
  const linkedCashiers = allUsers.filter(
    u => u.role === 'user' && u.club_owner_id === clubOwnerId
  );

  // Users with role 'user' but NOT linked to any club (created by platform invite)
  // Only show users that were invited by this admin (created_by === user.email) or unlinked
  const unlinkedCashiers = allUsers.filter(
    u => u.role === 'user' && !u.club_owner_id
  );

  const resetForm = () => setForm({ full_name: '', email: '', phone: '' });

  const handleInvite = async () => {
    if (!form.full_name.trim()) { toast.error('Ad Soyad məcburidir'); return; }
    if (!form.email.trim() && !form.phone.trim()) { toast.error('Email və ya telefon məcburidir'); return; }
    if (!form.email.trim()) { toast.error('Qeydiyyat üçün email ünvanı məcburidir'); return; }

    setLoading(true);
    try {
      const res = await base44.functions.invoke('inviteCashier', {
        full_name: form.full_name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        club_owner_id: clubOwnerId,
      });

      setCreatedCredentials({
        email: form.email.trim().toLowerCase(),
        password: res.data?.password,
        full_name: form.full_name.trim(),
      });

      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      resetForm();
      setInviteDialog(false);
      toast.success('Kassir qeydiyyatdan keçirildi! Giriş məlumatları emailə göndərildi.');
    } catch (e) {
      toast.error(e.message || 'Xəta baş verdi');
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
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success(`${cashierUser.full_name} kluba əlavə edildi`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleUnlink = async (cashierUser) => {
    try {
      await base44.functions.invoke('updateUserRole', {
        target_user_id: cashierUser.id,
        role: 'user',
        club_owner_id: '',
      });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success(`${cashierUser.full_name} klubdan çıxarıldı`);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await base44.functions.invoke('deleteCashier', {
        target_user_id: deleteDialog.id,
      });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success(`${deleteDialog.full_name} sistemdən silindi`);
      setDeleteDialog(null);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const copyPassword = () => {
    if (createdCredentials?.password) {
      navigator.clipboard.writeText(createdCredentials.password);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-20">
      <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Kassir İdarəsi</h2>
        </div>
        <Button
          size="sm"
          onClick={() => { resetForm(); setInviteDialog(true); }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-xs"
        >
          <UserPlus className="w-3.5 h-3.5" /> Kassir əlavə et
        </Button>
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
                    <p className="text-sm font-medium text-foreground truncate">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    {c.user_code && (
                      <span className="text-[10px] text-green-400 font-mono">#{c.user_code}</span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-orange-400 hover:bg-orange-400/10"
                      title="Klubdan çıxar"
                      onClick={() => handleUnlink(c)}
                    >
                      <Unlink className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      title="Sistemdən sil"
                      onClick={() => setDeleteDialog(c)}
                    >
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
            Əlavə edilməmiş istifadəçilər ({unlinkedCashiers.length})
          </p>
          {unlinkedCashiers.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Bütün kassirler klublara bağlıdır</p>
          ) : (
            <div className="space-y-2">
              {unlinkedCashiers.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2.5 border border-border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() => handleLink(c)}
                    >
                      <Link2 className="w-3 h-3" /> Əlavə et
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      title="Sistemdən sil"
                      onClick={() => setDeleteDialog(c)}
                    >
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
              <UserPlus className="w-4 h-4 text-primary" /> Yeni Kassir Əlavə Et
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Kassir məlumatlarını daxil edin. Email məcburidir — giriş məlumatları emailə göndəriləcək.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Ad Soyad <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                className="bg-secondary border-border mt-1"
                placeholder="Əli Əliyev"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="bg-secondary border-border mt-1"
                placeholder="kassir@email.com"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="w-3 h-3" /> Telefon <span className="text-muted-foreground">(istəyə bağlı)</span>
              </Label>
              <Input
                type="tel"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="bg-secondary border-border mt-1"
                placeholder="050xxxxxxx"
              />
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                ✉️ Kassirə email göndəriləcək. Emaildə giriş linki, şifrə və giriş məlumatları olacaq.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setInviteDialog(false); resetForm(); }}>Ləğv et</Button>
            <Button
              onClick={handleInvite}
              disabled={loading || !form.full_name.trim() || !form.email.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? 'Qeydiyyat edilir...' : 'Kassir yarat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Dialog — shown after invite */}
      <Dialog open={!!createdCredentials} onOpenChange={() => setCreatedCredentials(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              ✅ Kassir Yaradıldı
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Giriş məlumatları həmçinin emailə göndərildi.
            </DialogDescription>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-foreground font-medium">{createdCredentials.full_name}</p>
              <div className="bg-secondary rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Email:</span>
                  <span className="text-sm font-mono text-foreground">{createdCredentials.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Şifrə:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-primary font-bold">{createdCredentials.password}</span>
                    <button onClick={copyPassword} className="text-muted-foreground hover:text-foreground">
                      {copiedPassword ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
                ⚠️ Bu şifrəni kassirə bildirin. Email təsdiqi etdikdən sonra bu şifrə ilə daxil ola bilər.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedCredentials(null)} className="bg-primary hover:bg-primary/90 text-primary-foreground w-full">Bağla</Button>
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
            <strong className="text-foreground">{deleteDialog?.full_name}</strong> ({deleteDialog?.email}) sistemdən tamamilə silinəcək. Bu əməliyyat geri qaytarıla bilməz.
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