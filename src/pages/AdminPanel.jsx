import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ShieldAlert, Trash2, AlertTriangle, Database, Users, ShoppingCart, Clock, CalendarDays } from 'lucide-react';
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
  const { data: reservations = [] } = useQuery({ queryKey: ['all-reservations-admin'], queryFn: () => base44.entities.Reservation.list() });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => base44.entities.Product.list() });
  const { data: tables = [] } = useQuery({ queryKey: ['tables'], queryFn: () => base44.entities.GameTable.list() });

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <ShieldAlert className="w-12 h-12 text-destructive/50" />
        <p className="text-muted-foreground">Bu bölməyə yalnız administratorlar daxil ola bilər.</p>
      </div>
    );
  }

  const handleDeleteAll = async () => {
    if (confirmInput !== CONFIRM_TEXT) {
      toast.error('Təsdiq mətni yanlışdır');
      return;
    }
    setDeleting(true);
    try {
      // Delete all transactional data
      await Promise.all(sessions.map(s => base44.entities.Session.delete(s.id)));
      await Promise.all(orders.map(o => base44.entities.Order.delete(o.id)));
      await Promise.all(reservations.map(r => base44.entities.Reservation.delete(r.id)));
      // Reset table statuses
      await Promise.all(tables.map(t => base44.entities.GameTable.update(t.id, { status: 'available', current_session_id: '' })));
      queryClient.invalidateQueries();
      toast.success('Bütün məlumatlar silindi');
      setDeleteDialog(false);
      setConfirmInput('');
      setStep(1);
    } catch (err) {
      toast.error('Xəta baş verdi: ' + err.message);
    }
    setDeleting(false);
  };

  const dataStats = [
    { label: 'Sessiyalar', count: sessions.length, icon: Clock, color: 'text-primary' },
    { label: 'Sifarişlər', count: orders.length, icon: ShoppingCart, color: 'text-accent' },
    { label: 'Rezervasiyalar', count: reservations.length, icon: CalendarDays, color: 'text-blue-400' },
    { label: 'Məhsullar', count: products.length, icon: Database, color: 'text-green-400' },
    { label: 'Masalar', count: tables.length, icon: Users, color: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <ShieldAlert className="w-7 h-7 text-primary" />
          Admin Panel
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Sistem idarəsi və məlumat əməliyyatları</p>
      </div>

      {/* Data Overview */}
      <div>
        <h2 className="font-semibold text-foreground mb-3 text-sm">Məlumat İcmalı</h2>
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
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 bg-destructive/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-bold text-destructive">Təhlükəli Zona</h3>
            <p className="text-sm text-muted-foreground mt-0.5">Bu bölmədəki əməliyyatlar GERİ QAYTARILMAZ</p>
          </div>
        </div>

        <div className="border border-destructive/30 rounded-xl p-4 bg-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground text-sm">Bütün məlumatları sil</p>
              <p className="text-xs text-muted-foreground mt-1">
                Bütün sessiyalar, sifarişlər və rezervasiyalar silinəcək. Masalar, məhsullar və istifadəçilər qalacaq.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { setDeleteDialog(true); setStep(1); setConfirmInput(''); }}
              className="shrink-0 gap-2"
            >
              <Trash2 className="w-4 h-4" /> Sil
            </Button>
          </div>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={(v) => { if (!deleting) { setDeleteDialog(v); setStep(1); setConfirmInput(''); } }}>
        <DialogContent className="bg-card border-destructive/30 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {step === 1 ? 'Əminsiniz?' : step === 2 ? 'Son xəbərdarlıq' : 'Təsdiq'}
            </DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                Bu əməliyyat <strong className="text-destructive">{sessions.length} sessiya</strong>, <strong className="text-destructive">{orders.length} sifariş</strong> və <strong className="text-destructive">{reservations.length} rezervasiya</strong> məlumatını <strong>daimi</strong> silir.
              </p>
              <p className="text-xs text-muted-foreground">Bu əməliyyat geri qaytarıla bilməz!</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 py-2">
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <p className="text-sm text-destructive font-medium">⚠ Bütün tarixçə məlumatları silinəcək</p>
              </div>
              <p className="text-sm text-muted-foreground">Bu son xəbərdarlıqdır. Davam etmək istəyirsiniz?</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">Davam etmək üçün aşağıdakı mətni daxil edin:</p>
              <p className="text-xs font-mono text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{CONFIRM_TEXT}</p>
              <Input
                value={confirmInput}
                onChange={e => setConfirmInput(e.target.value)}
                placeholder="Mətni daxil edin..."
                className="bg-secondary border-destructive/30"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialog(false); setStep(1); }} disabled={deleting}>Ləğv et</Button>
            {step < 3 ? (
              <Button variant="destructive" onClick={() => setStep(s => s + 1)}>
                Davam et
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                disabled={confirmInput !== CONFIRM_TEXT || deleting}
              >
                {deleting ? 'Silinir...' : 'Bütün məlumatları sil'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}