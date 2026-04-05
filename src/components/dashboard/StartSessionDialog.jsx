import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Monitor, Gamepad2, Clock, Infinity } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_TIMES = [30, 60, 90, 120, 180];

export default function StartSessionDialog({ open, onOpenChange, table, onConfirm }) {
  const [mode, setMode] = useState('timed');
  const [duration, setDuration] = useState(60);

  if (!table) return null;

  const cost = ((duration / 60) * table.hourly_rate).toFixed(2);
  const perMinute = (table.hourly_rate / 60).toFixed(2);

  const handleConfirm = () => {
    onConfirm(table, mode === 'unlimited' ? null : duration);
    onOpenChange(false);
    setDuration(60);
    setMode('timed');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {table.type === 'pc' ? <Monitor className="w-5 h-5 text-primary" /> : <Gamepad2 className="w-5 h-5 text-primary" />}
            {table.name} — Sessiya Aç
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('timed')}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all",
                mode === 'timed'
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
              )}
            >
              <Clock className="w-4 h-4" /> Müddətli
            </button>
            <button
              onClick={() => setMode('unlimited')}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all",
                mode === 'unlimited'
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border bg-secondary text-muted-foreground hover:border-accent/40"
              )}
            >
              <Infinity className="w-4 h-4" /> Limitsiz
            </button>
          </div>

          {/* Unlimited info */}
          {mode === 'unlimited' && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 space-y-1">
              <p className="text-sm font-semibold text-accent flex items-center gap-2">
                <Infinity className="w-4 h-4" /> Limitsiz Rejim
              </p>
              <p className="text-xs text-muted-foreground">Sessiya bağlandıqda keçən vaxtа görə avtomatik hesablanacaq.</p>
              <p className="text-xs text-accent font-medium mt-1">{perMinute} ₼ / dəqiqə</p>
            </div>
          )}

          {/* Timed options */}
          {mode === 'timed' && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Sürətli seçim (dəqiqə)</Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_TIMES.map(t => (
                    <Button
                      key={t}
                      size="sm"
                      variant={duration === t ? "default" : "outline"}
                      onClick={() => setDuration(t)}
                      className="text-xs"
                    >
                      {t} dəq
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Xüsusi müddət (dəqiqə)</Label>
                <Input
                  type="number"
                  min={10}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="bg-secondary border-border"
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Müddət</span>
                  <span className="text-foreground font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {duration} dəqiqə
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saatlıq</span>
                  <span className="text-foreground">{table.hourly_rate} ₼</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-semibold text-foreground">Cəmi</span>
                  <span className="font-bold text-primary text-lg">{cost} ₼</span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ləğv et</Button>
          <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Başlat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}