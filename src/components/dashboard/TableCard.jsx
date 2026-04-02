import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Gamepad2, Play, Square, RotateCcw, Power, Coffee, Clock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTime(totalSeconds) {
  if (totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TableCard({ table, session, onStart, onStop, onRestart, onShutdown, onExtend, onOrder }) {
  const [remaining, setRemaining] = useState(null);
  const isOccupied = table.status === 'occupied' && session;

  useEffect(() => {
    if (!isOccupied || !session?.end_time) { setRemaining(null); return; }
    const update = () => {
      const diff = Math.floor((new Date(session.end_time) - new Date()) / 1000);
      setRemaining(Math.max(0, diff));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isOccupied, session?.end_time]);

  const isWarning = remaining !== null && remaining <= 600 && remaining > 300;
  const isDanger = remaining !== null && remaining <= 300;
  const isExpired = remaining !== null && remaining === 0;

  const totalCost = session ? ((session.session_cost || 0) + (session.orders_cost || 0)).toFixed(2) : '0.00';

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 border",
      isOccupied
        ? isDanger
          ? "border-destructive/50 danger-pulse"
          : isWarning
            ? "border-yellow-500/50 warning-pulse"
            : "border-primary/30 pulse-glow"
        : "border-border hover:border-muted-foreground/30"
    )}>
      {/* Status indicator line */}
      <div className={cn(
        "h-1 w-full",
        isOccupied
          ? isDanger ? "bg-destructive" : isWarning ? "bg-yellow-500" : "bg-primary"
          : "bg-muted"
      )} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              isOccupied ? "bg-primary/10" : "bg-muted"
            )}>
              {table.type === 'pc'
                ? <Monitor className={cn("w-5 h-5", isOccupied ? "text-primary" : "text-muted-foreground")} />
                : <Gamepad2 className={cn("w-5 h-5", isOccupied ? "text-primary" : "text-muted-foreground")} />
              }
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">{table.name}</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {table.type === 'pc' ? 'Kompüter' : 'PlayStation'}
              </p>
            </div>
          </div>
          <Badge variant={isOccupied ? "default" : "secondary"} className={cn(
            "text-[10px]",
            isOccupied 
              ? isDanger ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-primary/10 text-primary border border-primary/20"
              : ""
          )}>
            {isOccupied ? (isExpired ? 'Vaxt bitdi' : 'Aktiv') : 'Boş'}
          </Badge>
        </div>

        {/* Timer */}
        {isOccupied && remaining !== null && (
          <div className={cn(
            "text-center py-3 rounded-lg mb-3",
            isDanger ? "bg-destructive/5" : isWarning ? "bg-yellow-500/5" : "bg-primary/5"
          )}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className={cn("w-3.5 h-3.5", isDanger ? "text-destructive" : isWarning ? "text-yellow-500" : "text-primary")} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Qalan vaxt</span>
            </div>
            <span className={cn(
              "text-2xl font-mono font-bold tracking-wider",
              isDanger ? "text-destructive" : isWarning ? "text-yellow-500" : "text-primary"
            )}>
              {formatTime(remaining)}
            </span>
          </div>
        )}

        {/* Cost */}
        {isOccupied && (
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 mb-3">
            <span className="text-xs text-muted-foreground">Ümumi</span>
            <span className="text-sm font-bold text-foreground">{totalCost} ₼</span>
          </div>
        )}

        {/* Price info when available */}
        {!isOccupied && (
          <div className="text-center py-2 mb-3">
            <span className="text-lg font-bold text-muted-foreground">{table.hourly_rate} ₼</span>
            <span className="text-xs text-muted-foreground"> / saat</span>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-1.5">
          {!isOccupied ? (
            <Button size="sm" className="col-span-2 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => onStart(table)}>
              <Play className="w-3.5 h-3.5 mr-1.5" /> Aç
            </Button>
          ) : (
            <>
              <Button size="sm" variant="destructive" onClick={() => onStop(table, session)} className="text-xs">
                <Square className="w-3 h-3 mr-1" /> Bağla
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onOrder(table, session)} className="text-xs">
                <Coffee className="w-3 h-3 mr-1" /> Sifariş
              </Button>
              <Button size="sm" variant="outline" onClick={() => onRestart(table)} className="text-xs">
                <RotateCcw className="w-3 h-3 mr-1" /> Restart
              </Button>
              <Button size="sm" variant="outline" onClick={() => onExtend(table, session)} className="text-xs">
                <Plus className="w-3 h-3 mr-1" /> Uzat
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}