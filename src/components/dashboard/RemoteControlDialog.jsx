import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Power, RotateCcw, PowerOff } from 'lucide-react';
import { toast } from 'sonner';

export default function RemoteControlDialog({ open, onOpenChange, table }) {
  if (!table) return null;

  const handleAction = (action) => {
    // Simulate remote control action
    const actions = {
      restart: 'yenidən başladılır',
      shutdown: 'söndürülür',
    };
    toast.success(`${table.name} ${actions[action]}...`, {
      description: table.ip_address ? `IP: ${table.ip_address}` : 'IP təyin edilməyib'
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-foreground">{table.name} — Uzaqdan İdarə</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleAction('restart')}
          >
            <RotateCcw className="w-4 h-4 mr-2 text-yellow-500" /> Yenidən başlat (Restart)
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={() => handleAction('shutdown')}
          >
            <PowerOff className="w-4 h-4 mr-2" /> Tamamilə söndür (Shutdown)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}