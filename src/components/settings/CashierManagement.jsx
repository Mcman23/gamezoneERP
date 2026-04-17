import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Users, UserPlus, Link2, Unlink, Trash2, Phone, Mail, User } from 'lucide-react';
import { toast } from 'sonner';

export default function CashierManagement({ user, clubOwnerId }) {
  const queryClient = useQueryClient();
  const [addDialog, setAddDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', phone_number: '' });

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['all-users'] });

  // Cashiers linked to this admin's club
  const linkedCashiers = allUsers.filter(u => u.role === 'user' && u.club_owner_id === clubOwnerId);
  // Unlinked users (role=user, no club_owner_id or different) — only those created by this admin via invite
  const unlinkedCashiers = allUsers.filter(u => u.role === 'user' && u.club_owner_id !== clubOwnerId && u.club_owner_id !== '');
  // Truly unlinked (no club)
  const freeCashiers = allUsers.filter(u => u.role === 'user' && (!u.club_owner_id || u.club_owner_id === ''));

  const handleAddCashier = async () => {
    if (!form.full_name.trim()) { toast.error('Ad soyad mütləqdir'); return; }
    if (!form.email.trim() && !form.phone_number.trim()) { toast.error('Email və ya telefon nömrəsi mütləqdir'); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('inviteCashier', {
        full_name: form.full_name.trim(),
        email: form.email.trim() || undefined,
        phone_number: form.phone_number.trim() || undefined,
      });
      if (res.data?.existing) {
        toast.success('Mövcud istifadəçi kluba əlavə edildi');
      } else {
        toast.success('Kassir dəvət edildi — email göndərildi');
      }
      invalidate();
      setAddDialog(false);
      setForm({ full_name: '', email: '', phone_number: '' });
    } catch (e) {
      toast.error(e.message || 'Xəta baş verdi');
    }
    setLoading(false);
  };

  const handleLink = async (cashier) => {
    try {
      await base44.functions.invoke('updateUserRole', {
        target_user_id: cashier.id,
        role: 'user',
        club_owner_id: clubOwnerId,
      });
      invalidate();
      toast.success(`${cashier.full_name} kluba əlavə edildi`);
    } catch (e) { toast.error(e.message); }
  };

  const handleUnlink = async (cashier) => {
    try {
      await base44.functions.invoke('updateUserRole', {
        target_user_id: cashier.id,
        role: 'user',
        club_owner_id: '',
      });
      invalidate();
      toast.success(`${cashier.full_name} klubdan çıxarıldı`);
    } catch (e) { toast.error(e.message); }
  };

  const handleDelete = async (cashier) => {
    try {
      await base44.functions.invoke('deleteCashier', { target_user_id: cashier.id });
      invalidate();
      toast.success(`${cashier.full_name} silindi`);
    } catch (e) { toast.error(e.message); }
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Kassir İdarəsi</h2>
        </div>
        <Button size="sm" onClick={() => setAddDialog(true)} className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground">
          <UserPlus className="w-3.5 h-3.5" /> Kassir əlavə et
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Linked cashiers */}
        <Card className="p-4 border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Kluba bağlı kassirler ({linkedCashiers.length})
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
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-orange-400" onClick={() => handleUnlink(c)} title="Klubdan çıxar">
                      <Unlink className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm(c)} title="Sil">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Free / unlinked cashiers */}
        <Card className="p-4 border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Əlavə edilməmiş istifadəçilər ({freeCashiers.length})
          </p>
          {freeCashiers.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Hamı artıq bir kluba bağlıdır</p>
          ) : (
            <div className="space-y-2">
              {freeCashiers.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleLink(c)} className="h-7 gap-1 text-xs">
                      <Link2 className="w-3 h-3" /> Əlavə et
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm(c)} title="Sil">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Add Cashier Dialog */}
      <Dialog open={addDialog} onOpenChange={v => { setAddDialog(v); if (!v) setForm({ full_name: '', email: '', phone_number: '' }); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" /> Yeni Kassir Əlavə Et
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <User className="w-3 h-3" /> Ad Soyad <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.full_name}
                onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Əli Həsənov"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Mail className="w-3 h-3" /> Email <span className="text-muted-foreground">(email və ya telefon mütləqdir)</span>
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="kassir@example.com"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Phone className="w-3 h-3" /> Telefon nömrəsi
              </Label>
              <Input
                value={form.phone_number}
                onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))}
                placeholder="+994501234567"
                className="bg-secondary border-border"
              />
            </div>
            <p className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
              💡 Kassirə sistemə giriş üçün dəvət emaili göndəriləcək. Mövcud istifadəçi isə birbaşa kluba bağlanacaq.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Ləğv et</Button>
            <Button
              onClick={handleAddCashier}
              disabled={loading || !form.full_name.trim() || (!form.email.trim() && !form.phone_number.trim())}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? 'Göndərilir...' : 'Əlavə et'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> İstifadəçini Sil
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            <strong className="text-foreground">{deleteConfirm?.full_name}</strong> adlı istifadəçi sistemdən tamamilə silinəcək. Bu əməliyyat geri qaytarılmazdır.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Ləğv et</Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}