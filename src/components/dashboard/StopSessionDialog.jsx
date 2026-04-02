import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function StopSessionDialog({ open, onOpenChange, table, session, onConfirm }) {
  if (!table || !session) return null;

  const totalCost = ((session.session_cost || 0) + (session.orders_cost || 0)).toFixed(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            {table.name} — Sessiyanı Bağla
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">Bu sessiyanı bağlamaq istəyirsiniz?</p>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ləğv et</Button>
          <Button variant="destructive" onClick={() => { onConfirm(table, session); onOpenChange(false); }}>
            Bağla & Hesabla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}