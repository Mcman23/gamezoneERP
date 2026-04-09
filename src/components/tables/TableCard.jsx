import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Gamepad2, Play, Square, Clock, Plus, Coffee, ArrowRightLeft, Link2, ChevronDown, ChevronUp, Zap, Lock, Tv2, Pause, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTime(totalSeconds) {
  if (totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor(totalSeconds % 3600 / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const catIcons = { computer: Monitor, playstation: Gamepad2, cabinet: Gamepad2, simulator: Tv2 };
const catLabels = { computer: 'PC', playstation: 'PS', cabinet: 'Kabinet • PS', simulator: 'Simulator' };

const statusConfig = {
  available: { label: 'BOŞ', variant: 'secondary' },
  occupied: { label: 'AKTİV', variant: 'default' },
  locked: { label: 'KİLİDLİ', variant: 'destructive' },
  maintenance: { label: 'BAXIM', variant: 'outline' },
  offline: { label: 'OFFLINE', variant: 'outline' }
};

export default function TableCard({ table, session, onStart, onStop, onPause, onResume, onExtend, onOrder, onMove, onMerge, onRemote, isAdmin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const isPaused = session?.status === 'paused';
  const isOccupied = table.status === 'occupied' && session;
  const isLocked = table.status === 'locked' || table.status === 'offline' || table.status === 'maintenance';

  useEffect(() => {
    if (!isOccupied) {setRemaining(null);return;}
    if (isPaused) return; // timer does NOT tick during pause
    if (session?.is_unlimited) {
      const pausedMs = (session.total_paused_minutes || 0) * 60000;
      const update = () => {
        const totalMs = new Date() - new Date(session.start_time);
        setElapsedSecs(Math.max(0, Math.floor((totalMs - pausedMs) / 1000)));
      };
      update();
      const iv = setInterval(update, 1000);
      return () => clearInterval(iv);
    }
    if (!session?.end_time) {setRemaining(null);return;}
    const update = () => setRemaining(Math.max(0, Math.floor((new Date(session.end_time) - new Date()) / 1000)));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [isOccupied, isPaused, session?.end_time, session?.is_unlimited, session?.start_time, session?.total_paused_minutes]);

  const isUnlimited = session?.is_unlimited;
  const isWarning = !isUnlimited && !isPaused && remaining !== null && remaining <= 600 && remaining > 300;
  const isDanger = !isUnlimited && !isPaused && remaining !== null && remaining <= 300;
  const Icon = catIcons[table.category] || Monitor;
  const totalCost = session ? ((session.session_cost || 0) + (session.orders_cost || 0)).toFixed(2) : '0.00';

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 border",
      isLocked ? "border-muted opacity-60" :
      isOccupied ? isDanger ? "border-destructive/50 danger-pulse" : isWarning ? "border-yellow-500/50 warning-pulse" : "border-primary/30 pulse-glow" :
      "border-border hover:border-muted-foreground/30"
    )}>
      <div className={cn("h-1 w-full", isLocked ? "bg-muted" : isOccupied ? isDanger ? "bg-destructive" : isWarning ? "bg-yellow-500" : "bg-primary" : "bg-muted")} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", isOccupied ? "bg-primary/10" : "bg-muted")}>
              <Icon className="text-[hsl(var(--ring))] lucide lucide-monitor w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">{table.name}</h3>
              <p className="text-muted-foreground text-sm">({table.code}) {table.zone === 'cabinet' ? 'Kabinet' : 'Zal'} • {catLabels[table.category]}</p>
            </div>
          </div>
          <Badge variant={statusConfig[table.status]?.variant || 'secondary'} className="bg-secondary text-[#e00000] px-2.5 py-0.5 font-semibold rounded-md inline-flex items-center border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-secondary/80">
            {isLocked && <Lock className="w-3 h-3 mr-1" />}
            {statusConfig[table.status]?.label || table.status}
          </Badge>
        </div>

        {/* Timer */}
        {isOccupied && isUnlimited &&
        <div className="text-center py-3 rounded-lg mb-3 bg-accent/5">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Keçən vaxt</span>
            </div>
            <span className="text-2xl font-mono font-bold tracking-wider text-accent">{formatTime(elapsedSecs)}</span>
          </div>
        }
        {isOccupied && !isUnlimited && remaining !== null &&
        <div className={cn("text-center py-3 rounded-lg mb-3", isDanger ? "bg-destructive/5" : isWarning ? "bg-yellow-500/5" : "bg-primary/5")}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className={cn("w-3.5 h-3.5", isDanger ? "text-destructive" : isWarning ? "text-yellow-500" : "text-primary")} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Qalan vaxt</span>
            </div>
            <span className={cn("text-2xl font-mono font-bold tracking-wider", isDanger ? "text-destructive" : isWarning ? "text-yellow-500" : "text-primary")}>{formatTime(remaining)}</span>
          </div>
        }

        {/* Cost */}
        {isPaused &&
        <div className="flex items-center justify-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-1.5 mb-2">
            <Pause className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs text-yellow-500 font-medium">Fasilə</span>
          </div>
        }
        {isOccupied &&
        <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2 mb-3">
            <span className="text-xs text-muted-foreground">Ümumi</span>
            <span className="text-sm font-bold text-foreground">{totalCost} ₼</span>
          </div>
        }

        {/* Price */}
        {!isOccupied && !isLocked &&
        <div className="text-center py-2 mb-3">
            <span className="text-lg font-bold text-foreground">{table.hourly_rate} ₼</span>
            <span className="text-xs text-muted-foreground"> / saat</span>
          </div>
        }

        {/* Actions */}
        <div className="space-y-1.5">
          {!isOccupied && !isLocked &&
          <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => onStart(table)}>
              <Play className="w-3.5 h-3.5 mr-1.5" /> Aç
            </Button>
          }
          {isOccupied &&
          <>
              <div className="grid grid-cols-2 gap-1.5">
                <Button size="sm" variant="destructive" onClick={() => onStop(table, session)} className="text-xs">
                  <Square className="w-3 h-3 mr-1" /> Bağla
                </Button>
                {isPaused ?
              <Button size="sm" variant="outline" onClick={() => onResume(table, session)} className="text-xs text-green-500 border-green-500/30">
                    <PlayCircle className="w-3 h-3 mr-1" /> Davam
                  </Button> :

              <Button size="sm" variant={menuOpen ? 'secondary' : 'outline'} onClick={() => setMenuOpen((v) => !v)} className="text-xs font-medium">
                    <Zap className="w-3 h-3 mr-1" /> Ətraflı
                    {menuOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                  </Button>
              }
              </div>
              {menuOpen && !isPaused &&
            <div className="rounded-xl border border-border bg-secondary/60 p-2 space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <MenuBtn icon={Pause} label="Fasilə" color="yellow-500" onClick={() => {onPause(table, session);setMenuOpen(false);}} />
                  <MenuBtn icon={Plus} label="Vaxt uzat" color="primary" onClick={() => {onExtend(table, session);setMenuOpen(false);}} />
                  <MenuBtn icon={Coffee} label="Sifariş" color="accent" onClick={() => {onOrder(table, session);setMenuOpen(false);}} />
                  <MenuBtn icon={ArrowRightLeft} label="Köçür" color="blue-400" onClick={() => {onMove(table);setMenuOpen(false);}} />
                  <MenuBtn icon={Link2} label="Birləşdir" color="purple-400" onClick={() => {onMerge(table);setMenuOpen(false);}} />
                  {isAdmin && <MenuBtn icon={Monitor} label="Uzaqdan idarə" color="yellow-500" onClick={() => {onRemote(table);setMenuOpen(false);}} />}
                </div>
            }
            </>
          }
        </div>
      </div>
    </Card>);

}

function MenuBtn({ icon: Icon, label, color, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border hover:bg-primary/5 transition-all group">
      <div className={`w-7 h-7 rounded-lg bg-${color}/10 flex items-center justify-center`}>
        <Icon className={`w-3.5 h-3.5 text-${color}`} />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </button>);

}