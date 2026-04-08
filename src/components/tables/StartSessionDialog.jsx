import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Clock, Infinity, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { roundCost } from '@/lib/tableConfig';

const PS_RATES = { ps3: 1.5, ps4: 3, ps5: 5 };
const PS_MODELS = [
  { key: 'ps3', label: 'PS3', rate: 1.5 },
  { key: 'ps4', label: 'PS4', rate: 3 },
  { key: 'ps5', label: 'PS5', rate: 5 },
];

const QUICK_TIMES = [30, 60, 90, 120, 180];

const isPS = (table) => table?.category === 'playstation' || table?.category === 'cabinet';

export default function StartSessionDialog({ open, onOpenChange, table, onConfirm }) {
  const [mode, setMode] = useState('timed');
  const [duration, setDuration] = useState(60);
  const [psModel, setPsModel] = useState(null);

  useEffect(() => {
    if (open && isPS(table)) {
      setPsModel(table.ps_model && table.ps_model !== 'none' ? table.ps_model : 'ps4');
    } else {
      setPsModel(null);
    }
  }, [open, table?.id]);

  if (!table) return null;

  const effectiveRate = (isPS(table) && psModel) ? (PS_RATES[psModel] ?? table.hourly_rate) : table.hourly_rate;
  const cost = roundCost((duration / 60) * effectiveRate);
  const perMinute = roundCost(effectiveRate / 60);

  const handleConfirm = () => {
    onConfirm(table, mode === 'unlimited' ? null : duration, isPS(table) && psModel ? effectiveRate : null);
    onOpenChange(false);
    setDuration(60);
    setMode('timed');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground">{table.name} — Sessiya Aç</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* PS Model Selector */}
          {isPS(table) && (
            <div>
              <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Gamepad2 className="w-3.5 h-3.5" /> PlayStation Modeli</Label>
              <div className="grid grid-cols-3 gap-2">
                {PS_MODELS.map(m => (
                  <button
                    key={m.key}
                    onClick={() => setPsModel(m.key)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all",
                      psModel === m.key
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-secondary text-muted-foreground hover:border-accent/40"
                    )}
                  >
                    <span>{m.label}</span>
                    <span className="text-xs font-medium">{m.rate} ₼/saat</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode('timed')} className={cn("flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all", mode === 'timed' ? "border-primary bg-primary/10 text-primary" : "border-border bg-secondary text-muted-foreground")}>
              <Clock className="w-4 h-4" /> Müddətli
            </button>
            <button onClick={() => setMode('unlimited')} className={cn("flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all", mode === 'unlimited' ? "border-accent bg-accent/10 text-accent" : "border-border bg-secondary text-muted-foreground")}>
              <Infinity className="w-4 h-4" /> Limitsiz
            </button>
          </div>

          {mode === 'unlimited' && (
            <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-accent flex items-center gap-2"><Infinity className="w-4 h-4" /> Limitsiz Rejim</p>
              <p className="text-xs text-muted-foreground mt-1">{perMinute} ₼ / dəqiqə</p>
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
                <Label className="text-xs text-muted-foreground mb-1.5 block">Xüsusi müddət</Label>
                <Input type="number" min={10} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="bg-secondary border-border" />
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Müddət</span>
                  <span className="text-foreground font-medium">{duration} dəqiqə</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Saatlıq</span>
                  <span className="text-foreground">{table.hourly_rate} ₼</span>
                </div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between">
                  <span className="font-semibold text-foreground">Cəmi</span>
                  <span className="font-bold text-primary text-lg">{cost.toFixed(2)} ₼</span>
                </div>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ləğv et</Button>
          <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90 text-primary-foreground">Başlat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}