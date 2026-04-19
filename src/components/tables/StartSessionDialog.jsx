import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Monitor, Gamepad2, Clock, Infinity, User, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_TIMES = [30, 60, 90, 120, 180];

export default function StartSessionDialog({ open, onOpenChange, table, onConfirm }) {
  const [mode, setMode] = useState('timed');
  const [duration, setDuration] = useState(60);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  if (!table) return null;

  const cost = ((duration / 60) * table.hourly_rate).toFixed(2);
  const perMinute = (table.hourly_rate / 60).toFixed(2);

  const handleConfirm = () => {
    onConfirm(table, mode === 'unlimited' ? null : duration, null, customerPhone || null, customerName || null);
    onOpenChange(false);
    setDuration(60);
    setMode('timed');
    setCustomerName('');
    setCustomerPhone('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {table.category === 'computer' ? <Monitor className="w-5 h-5 text-primary" /> : <Gamepad2 className="w-5 h-5 text-primary" />}
            {table.name} — Sessiya Aç
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode('timed')} className={cn("flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all", mode === 'timed' ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground hover:border-primary/40")}>
              <Clock className="w-4 h-4" /> Müddətli
            </button>
            <button onClick={() => setMode('unlimited')} className={cn("flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all", mode === 'unlimited' ? "border-accent bg-accent/10 text-accent" : "border-border bg-secondary text-muted-foreground hover:border-accent/40")}>
              <Infinity className="w-4 h-4" /> Limitsiz
            </button>
          </div>
          {mode === 'unlimited' && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-1">
              <p className="text-sm font-semibold text-accent flex items-center gap-2"><Infinity className="w-4 h-4" /> Limitsiz Rejim</p>
              <p className="text-xs text-muted-foreground">Sessiya bağlandıqda keçən vaxta görə avtomatik hesablanacaq.</p>
              <p className="text-xs text-accent font-medium mt-1">{perMinute} ₼ / dəqiqə</p>
            </div>
          )}
          {mode === 'timed' && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Sürətli seçim (dəqiqə)</Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TIMES.map(t => (
                    <Button key={t} size="sm" variant={duration === t ? "default" : "outline"} onClick={() => setDuration(t)} className="text-xs">{t} dəq</Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Xüsusi müddət (dəqiqə)</Label>
                <Input type="number" value={duration} onChange={e => setDuration(Math.max(5, Number(e.target.value)))} min={5} max={600} className="bg-secondary border-border" />
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{duration} dəq × {table.hourly_rate} ₼/saat</span>
                <span className="text-lg font-bold text-primary">{cost} ₼</span>
              </div>
            </>
          )}
          <div className="border-t border-border pt-3 space-y-2">
            <Label className="text-xs text-muted-foreground block">Müştəri məlumatı (ixtiyari)</Label>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input placeholder="Ad soyad" value={customerName} onChange={e => setCustomerName(e.target.value)} className="bg-secondary border-border text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input placeholder="Telefon (050...)" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="bg-secondary border-border text-sm" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Ləğv et</Button>
          <Button className="flex-1" onClick={handleConfirm}>Masanı Aç</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}