import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Monitor, Gamepad2, Save, RotateCcw, Info, GripHorizontal, Move } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const GRID = 20;
const CANVAS_W = 900;
const CANVAS_H = 600;
const CARD_W = 110;
const CARD_H = 90;

function snap(val) {
  return Math.round(val / GRID) * GRID;
}

function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function TableNode({ table, isDragging, onMouseDown }) {
  const isOccupied = table.status === 'occupied';
  const isMaintenance = table.status === 'maintenance';

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: table.pos_x || 40,
        top: table.pos_y || 40,
        width: CARD_W,
        height: CARD_H,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        zIndex: isDragging ? 100 : 1,
      }}
      className={cn(
        "rounded-xl border-2 transition-shadow",
        isDragging && "shadow-2xl shadow-primary/30 scale-105",
        isOccupied
          ? "border-primary/60 bg-primary/10"
          : isMaintenance
            ? "border-yellow-500/60 bg-yellow-500/10"
            : "border-border bg-card hover:border-muted-foreground/40"
      )}
    >
      {/* Grip handle */}
      <div className="absolute top-1 right-1 opacity-30">
        <Move className="w-3 h-3 text-muted-foreground" />
      </div>

      <div className="flex flex-col items-center justify-center h-full gap-1 px-2">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center",
          isOccupied ? "bg-primary/20" : "bg-secondary"
        )}>
          {table.type === 'pc'
            ? <Monitor className={cn("w-5 h-5", isOccupied ? "text-primary" : "text-muted-foreground")} />
            : <Gamepad2 className={cn("w-5 h-5", isOccupied ? "text-primary" : isMaintenance ? "text-yellow-500" : "text-muted-foreground")} />
          }
        </div>
        <span className="text-xs font-bold text-foreground">{table.name}</span>
        <span className={cn(
          "text-[10px] font-medium px-2 py-0.5 rounded-full",
          isOccupied ? "text-primary bg-primary/10" : isMaintenance ? "text-yellow-500 bg-yellow-500/10" : "text-muted-foreground bg-secondary"
        )}>
          {isOccupied ? 'Aktiv' : isMaintenance ? 'Texniki' : 'Boş'}
        </span>
      </div>
    </div>
  );
}

export default function SalonLayout() {
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [positions, setPositions] = useState({});
  const [dragging, setDragging] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const { data: tables = [], isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => base44.entities.GameTable.list('order_number'),
    onSuccess: (data) => {
      // Initialize positions from DB
      const pos = {};
      data.forEach((t, i) => {
        pos[t.id] = {
          x: t.pos_x != null && t.pos_x > 0 ? t.pos_x : (i % 5) * (CARD_W + GRID) + GRID,
          y: t.pos_y != null && t.pos_y > 0 ? t.pos_y : Math.floor(i / 5) * (CARD_H + GRID * 2) + GRID,
        };
      });
      setPositions(pos);
    }
  });

  // Merge DB positions with local overrides
  const getPos = (table, i) => {
    if (positions[table.id]) return positions[table.id];
    if (table.pos_x > 0 || table.pos_y > 0) return { x: table.pos_x, y: table.pos_y };
    return {
      x: (i % 5) * (CARD_W + GRID) + GRID,
      y: Math.floor(i / 5) * (CARD_H + GRID * 2) + GRID,
    };
  };

  const handleMouseDown = useCallback((e, table) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const tablePos = positions[table.id] || { x: table.pos_x || 0, y: table.pos_y || 0 };
    dragOffset.current = {
      x: (e.clientX - rect.left) * scaleX - tablePos.x,
      y: (e.clientY - rect.top) * scaleY - tablePos.y,
    };
    setDragging(table.id);

    const onMouseMove = (ev) => {
      const r = canvas.getBoundingClientRect();
      const nx = snap(clamp((ev.clientX - r.left) * scaleX - dragOffset.current.x, 0, CANVAS_W - CARD_W));
      const ny = snap(clamp((ev.clientY - r.top) * scaleY - dragOffset.current.y, 0, CANVAS_H - CARD_H));
      setPositions(prev => ({ ...prev, [table.id]: { x: nx, y: ny } }));
      setHasChanges(true);
    };

    const onMouseUp = () => {
      setDragging(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [positions]);

  const handleSave = async () => {
    await Promise.all(
      Object.entries(positions).map(([id, pos]) =>
        base44.entities.GameTable.update(id, { pos_x: pos.x, pos_y: pos.y })
      )
    );
    queryClient.invalidateQueries({ queryKey: ['tables'] });
    setHasChanges(false);
    toast.success('Salon planı saxlanıldı');
  };

  const handleReset = () => {
    const pos = {};
    tables.forEach((t, i) => {
      pos[t.id] = {
        x: (i % 5) * (CARD_W + GRID) + GRID,
        y: Math.floor(i / 5) * (CARD_H + GRID * 2) + GRID,
      };
    });
    setPositions(pos);
    setHasChanges(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Salon Planı</h1>
          <p className="text-sm text-muted-foreground mt-1">Masaları sürüşdürərək salon dizaynınıza uyğun yerləşdirin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1.5" /> Sıfırla
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Save className="w-4 h-4 mr-1.5" /> Saxla
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary/60 border border-primary" />
          <span className="text-muted-foreground">Aktiv</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-secondary border border-border" />
          <span className="text-muted-foreground">Boş</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500/60 border border-yellow-500" />
          <span className="text-muted-foreground">Texniki</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <Info className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Masaları siçanla sürüşdürün</span>
        </div>
      </div>

      {/* Canvas */}
      <Card className="border-border overflow-hidden">
        <div
          ref={canvasRef}
          className="relative bg-secondary/30 overflow-hidden"
          style={{
            width: '100%',
            paddingBottom: `${(CANVAS_H / CANVAS_W) * 100}%`,
            backgroundImage:
              `radial-gradient(circle, hsl(215 20% 30% / 0.4) 1px, transparent 1px)`,
            backgroundSize: `${GRID}px ${GRID}px`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: CANVAS_W,
              height: CANVAS_H,
              transformOrigin: 'top left',
            }}
            className="w-full h-full"
          >
            {/* Room sections labels */}
            <div className="absolute top-3 left-3 px-3 py-1 bg-blue-400/10 border border-blue-400/20 rounded-lg">
              <span className="text-[10px] font-semibold text-blue-400 tracking-widest uppercase">PC Bölmə</span>
            </div>
            <div className="absolute top-3 right-3 px-3 py-1 bg-accent/10 border border-accent/20 rounded-lg">
              <span className="text-[10px] font-semibold text-accent tracking-widest uppercase">PS Bölmə</span>
            </div>

            {/* Divider */}
            <div className="absolute top-0 bottom-0" style={{ left: '50%', width: 1, background: 'hsl(222 30% 22%)' }}>
              <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 bg-card rounded text-[10px] text-muted-foreground whitespace-nowrap">
                Koridor
              </div>
            </div>

            {/* Tables */}
            {!isLoading && tables.map((table, i) => {
              const pos = getPos(table, i);
              return (
                <TableNode
                  key={table.id}
                  table={{ ...table, pos_x: pos.x, pos_y: pos.y }}
                  isDragging={dragging === table.id}
                  onMouseDown={(e) => handleMouseDown(e, table)}
                />
              );
            })}
          </div>
        </div>
      </Card>

      {/* Table count summary */}
      <div className="flex flex-wrap gap-2">
        {[
          { type: 'pc', label: 'PC', IconComp: Monitor, color: 'text-blue-400' },
          { type: 'playstation', label: 'PlayStation', IconComp: Gamepad2, color: 'text-accent' },
        ].map(({ type, label, IconComp, color }) => {
          const count = tables.filter(t => t.type === type).length;
          const occupied = tables.filter(t => t.type === type && t.status === 'occupied').length;
          return (
            <Card key={type} className="px-4 py-2 border-border flex items-center gap-3">
              <IconComp className={`w-4 h-4 ${color}`} />
              <span className="text-sm font-medium text-foreground">{label}</span>
              <Badge variant="secondary" className="text-xs">{occupied}/{count} aktiv</Badge>
            </Card>
          );
        })}
        {hasChanges && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-xs font-medium">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            Saxlanılmamış dəyişikliklər var
          </div>
        )}
      </div>
    </div>
  );
}