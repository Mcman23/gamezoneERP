import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Monitor, Gamepad2, Link2 } from 'lucide-react';

export default function MergeTableDialog({ open, onOpenChange, sourceTable, tables, sessionMap, onConfirm }) {
  const activeTables = tables.filter(t => t.id !== sourceTable?.id && t.status === 'occupied' && sessionMap[t.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            Masaları Birləşdir — {sourceTable?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <p className="text-xs text-muted-foreground mb-3">
            {sourceTable?.name} sessiyasını hansı aktiv masaya birləşdirmək istəyirsiniz? Bu masa bağlanacaq, xərclər hədəf masaya əlavə ediləcək.
          </p>
          {activeTables.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Digər aktiv masa yoxdur</p>
          )}
          {activeTables.map(table => {
            const session = sessionMap[table.id];
            return (
              <button
                key={table.id}
                onClick={() => { onConfirm(table, session); onOpenChange(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                  {table.type === 'pc' ? <Monitor className="w-5 h-5 text-primary" /> : <Gamepad2 className="w-5 h-5 text-primary" />}
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-foreground text-sm">{table.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Cəmi: {(session?.total_cost || 0).toFixed(2)} ₼ • Aktiv
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ləğv et</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}