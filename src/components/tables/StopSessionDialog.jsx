import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Banknote, CreditCard, Infinity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { roundCost } from '@/lib/tableConfig';

const QUICK_PAY = [1, 5, 10, 20, 50];

export default function StopSessionDialog({ open, onOpenChange, table, session, onConfirm }) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [elapsed, setElapsed] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');

  useEffect(() => {
    if (!open || !session?.is_unlimited) return;
    const update = () => setElapsed(Math.floor((new Date() - new Date(session.start_time)) / 60000));
    update();
    const iv = setInterval(update, 10000);
    return () => clearInterval(iv);
  }, [open, session]);

  useEffect(() => { if (open) setAmountPaid(''); }, [open]);

  if (!table || !session) return null;

  const isUnlimited = session.is_unlimited;
  const actualSessionCost = isUnlimited ? roundCost((elapsed / 60) * session.hourly_rate) : (session.session_cost || 0);
  const totalCost = roundCost(actualSessionCost + (session.orders_cost || 0));
  const paidNum = parseFloat(amountPaid) || 0;
  const change = paidNum > totalCost ? roundCost(paidNum - totalCost) : 0;

  const handleConfirm = () => {
    onConfirm(table, session, paymentMethod, isUnlimited ? elapsed : null, paidNum || null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {table.name} — Bağla
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-4">
          {isUnlimited && (
            <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2">
              <Infinity className="w-4 h-4 text-accent" />
              <span className="text-xs text-accent font-medium">Limitsiz — {elapsed} dəq keçib</span>
            </div>
          )}

          <div className="bg-secondary rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sessiya</span>
              <span className="text-foreground">{actualSessionCost.toFixed(2)} ₼</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sifarişlər</span>
              <span className="text-foreground">{(session.orders_cost || 0).toFixed(2)} ₼</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-semibold text-foreground">Ümumi</span>
              <span className="font-bold text-primary text-xl">{totalCost.toFixed(2)} ₼</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Ödəniş üsulu</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setPaymentMethod('cash')} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all", paymentMethod === 'cash' ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                <Banknote className="w-5 h-5" /><span className="text-xs font-semibold">Nağd</span>
              </button>
              <button onClick={() => setPaymentMethod('card')} className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all", paymentMethod === 'card' ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground")}>
                <CreditCard className="w-5 h-5" /><span className="text-xs font-semibold">Kart</span>
              </button>
            </div>
          </div>

          {/* Amount paid + change calculation */}
          {paymentMethod === 'cash' && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ödənilən məbləğ (₼)</Label>
              <div className="flex gap-1.5">
                {QUICK_PAY.map(v => (
                  <Button key={v} size="sm" variant="outline" onClick={() => setAmountPaid(String((paidNum || 0) + v))} className="text-xs flex-1">+{v}</Button>
                ))}
              </div>
              <Input type="number" min={0} step="0.5" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder={totalCost.toFixed(2)} className="bg-secondary border-border" />
              {change > 0 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                  <p className="text-xs text-muted-foreground">Qaytarılacaq</p>
                  <p className="text-2xl font-bold text-green-500">{change.toFixed(2)} ₼</p>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ləğv et</Button>
          <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            {totalCost.toFixed(2)} ₼ Qəbul Et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}