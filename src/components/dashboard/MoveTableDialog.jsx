import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Monitor, Gamepad2, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MoveTableDialog({ open, onOpenChange, sourceTable, tables, sessionMap, onConfirm }) {
  const availableTables = tables.filter(t => t.id !== sourceTable?.id && t.status !== 'occupied');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            Masa Köçür — {sourceTable?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <p className="text-xs text-muted-foreground mb-3">Sessiyanı köçürmək istədiyiniz boş masanı seçin:</p>
          {availableTables.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Boş masa yoxdur</p>
          )}
          {availableTables.map(table => (
            <button
              key={table.id}
              onClick={() => { onConfirm(table); onOpenChange(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", table.type === 'pc' ? 'bg-blue-400/10' : 'bg-accent/10')}>
                {table.type === 'pc' ? <Monitor className="w-5 h-5 text-blue-400" /> : <Gamepad2 className="w-5 h-5 text-accent" />}
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground text-sm">{table.name}</p>
                <p className="text-xs text-muted-foreground">{table.hourly_rate} ₼/saat • Boş</p>
              </div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ləğv et</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}