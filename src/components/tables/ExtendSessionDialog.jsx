import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Clock } from 'lucide-react';
import { roundCost } from '@/lib/tableConfig';

export default function ExtendSessionDialog({ open, onOpenChange, table, session, onConfirm }) {
  const [extraMinutes, setExtraMinutes] = useState(30);
  if (!table || !session) return null;

  const extraCost = roundCost((extraMinutes / 60) * table.hourly_rate);

  const handleConfirm = () => {
    onConfirm(table, session, extraMinutes);
    onOpenChange(false);
    setExtraMinutes(30);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> {table.name} — Vaxtı Uzat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            {[15, 30, 60, 90].map(t => (
              <Button key={t} size="sm" variant={extraMinutes === t ? "default" : "outline"} onClick={() => setExtraMinutes(t)} className="text-xs flex-1">{t} dəq</Button>
            ))}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Xüsusi (dəqiqə)</Label>
            <Input type="number" min={5} step={5} value={extraMinutes} onChange={(e) => setExtraMinutes(Number(e.target.value))} className="bg-secondary border-border" />
          </div>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between">
            <span className="text-muted-foreground text-sm">Əlavə məbləğ</span>
            <span className="font-bold text-primary text-lg">{extraCost.toFixed(2)} ₼</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ləğv et</Button>
          <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90 text-primary-foreground">Uzat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}