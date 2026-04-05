import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Gamepad2, Play, Square, RotateCcw, Power, Coffee, Clock, Plus, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTime(totalSeconds) {
  if (totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TableCard({ table, session, onStart, onStop, onRestart, onShutdown, onExtend, onOrder }) {
  const [menuOpen, setMenuOpen] = useState(false);
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
        <div className="space-y-1.5">
          {!isOccupied ? (
            <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => onStart(table)}>
              <Play className="w-3.5 h-3.5 mr-1.5" /> Aç
            </Button>
          ) : (
            <>
              {/* Quick stop button always visible */}
              <div className="grid grid-cols-2 gap-1.5">
                <Button size="sm" variant="destructive" onClick={() => onStop(table, session)} className="text-xs">
                  <Square className="w-3 h-3 mr-1" /> Bağla
                </Button>
                <Button
                  size="sm"
                  variant={menuOpen ? 'secondary' : 'outline'}
                  onClick={() => setMenuOpen(v => !v)}
                  className="text-xs font-medium"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  İdarəetmə
                  {menuOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                </Button>
              </div>

              {/* Expanded management menu */}
              {menuOpen && (
                <div className="rounded-xl border border-border bg-secondary/60 p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Masa İdarəetməsi</p>

                  {/* Extend */}
                  <button
                    onClick={() => { onExtend(table, session); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20">
                      <Plus className="w-4 h-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">Vaxt Əlavə Et</p>
                      <p className="text-[10px] text-muted-foreground">Sessiyanı uzat</p>
                    </div>
                  </button>

                  {/* Order */}
                  <button
                    onClick={() => { onOrder(table, session); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border hover:border-accent/40 hover:bg-accent/5 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20">
                      <Coffee className="w-4 h-4 text-accent" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">Məhsul Sifariş Et</p>
                      <p className="text-[10px] text-muted-foreground">Yemək & içki əlavə et</p>
                    </div>
                  </button>

                  {/* Restart */}
                  <button
                    onClick={() => { onRestart(table); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-card border border-border hover:border-yellow-500/40 hover:bg-yellow-500/5 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20">
                      <RotateCcw className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">Uzaqdan Restart</p>
                      <p className="text-[10px] text-muted-foreground">Cihazı yenidən başlat</p>
                    </div>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}