import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { RotateCcw, PowerOff, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

export default function RemoteControlDialog({ open, onOpenChange, table, isAdmin }) {
  const queryClient = useQueryClient();

  if (!table) return null;

  const handleAction = async (action) => {
    if (action === 'restart') {
      toast.success(`${table.name} yenidən başladılır...`, { description: table.ip_address || 'IP yoxdur' });
    } else if (action === 'shutdown') {
      if (table.status === 'occupied') {
        toast.error('Aktiv sessiya var! Əvvəl sessiyanı bağlayın.');
        return;
      }
      await base44.entities.GameTable.update(table.id, { status: 'offline' });
      toast.success(`${table.name} söndürüldü`);
    } else if (action === 'lock') {
      if (table.status === 'occupied') {
        toast.error('Aktiv sessiya var! Əvvəl sessiyanı bağlayın.');
        return;
      }
      await base44.entities.GameTable.update(table.id, { status: 'locked' });
      toast.success(`${table.name} kilidləndi`);
    } else if (action === 'unlock') {
      await base44.entities.GameTable.update(table.id, { status: 'available' });
      toast.success(`${table.name} açıldı`);
    }
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    onOpenChange(false);
  };

  if (!isAdmin) return null;

  const isLocked = table.status === 'locked' || table.status === 'offline';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-foreground">{table.name} — Uzaqdan İdarə</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Button variant="outline" className="w-full justify-start" onClick={() => handleAction('restart')}>
            <RotateCcw className="w-4 h-4 mr-2 text-yellow-500" /> Yenidən başlat
          </Button>
          {isLocked ? (
            <Button variant="outline" className="w-full justify-start text-green-500" onClick={() => handleAction('unlock')}>
              <Unlock className="w-4 h-4 mr-2" /> Kilidi aç
            </Button>
          ) : (
            <Button variant="outline" className="w-full justify-start text-orange-400" onClick={() => handleAction('lock')}>
              <Lock className="w-4 h-4 mr-2" /> Kilidlə
            </Button>
          )}
          <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => handleAction('shutdown')}>
            <PowerOff className="w-4 h-4 mr-2" /> Söndür
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}