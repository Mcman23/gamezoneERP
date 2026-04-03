import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Banknote, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StopSessionDialog({ open, onOpenChange, table, session, onConfirm }) {
  const [paymentMethod, setPaymentMethod] = useState('cash');

  if (!table || !session) return null;

  const totalCost = ((session.session_cost || 0) + (session.orders_cost || 0)).toFixed(2);

  const handleConfirm = () => {
    onConfirm(table, session, paymentMethod);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {table.name} — Sessiyanı Bağla
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* Cost breakdown */}
          <div className="bg-secondary rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sessiya qiyməti</span>
              <span className="text-foreground">{(session.session_cost || 0).toFixed(2)} ₼</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sifarişlər</span>
              <span className="text-foreground">{(session.orders_cost || 0).toFixed(2)} ₼</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between">
              <span className="font-semibold text-foreground">Ümumi məbləğ</span>
              <span className="font-bold text-primary text-xl">{totalCost} ₼</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Ödəniş üsulunu seçin</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  paymentMethod === 'cash'
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
                )}
              >
                <Banknote className="w-6 h-6" />
                <span className="text-sm font-semibold">Nağd</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  paymentMethod === 'card'
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-secondary text-muted-foreground hover:border-accent/40"
                )}
              >
                <CreditCard className="w-6 h-6" />
                <span className="text-sm font-semibold">Kart</span>
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ləğv et</Button>
          <Button
            onClick={handleConfirm}
            className={cn(
              "font-semibold",
              paymentMethod === 'card'
                ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            )}
          >
            {paymentMethod === 'cash' ? <Banknote className="w-4 h-4 mr-1.5" /> : <CreditCard className="w-4 h-4 mr-1.5" />}
            {totalCost} ₼ Qəbul Et
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}