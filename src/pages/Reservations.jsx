import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Gamepad2, Plus, Trash2, CalendarDays, Clock, User, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { az } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const TIME_SLOTS = ['09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'];

function buildWeek(base) {
  return Array.from({ length: 7 }, (_, i) => addDays(base, i));
}

export default function Reservations() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setHours(0,0,0,0); return d;
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', duration_hours: 1, notes: '' });

  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: () => base44.entities.GameTable.list('order_number'),
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations'],
    queryFn: () => base44.entities.Reservation.list('-created_date', 200),
  });

  const week = useMemo(() => buildWeek(weekStart), [weekStart]);

  const dayReservations = useMemo(() =>
    reservations.filter(r => r.date === format(selectedDate, 'yyyy-MM-dd') && r.status !== 'cancelled'),
    [reservations, selectedDate]
  );

  const isSlotTaken = (tableId, time) =>
    dayReservations.some(r => r.table_id === tableId && r.start_time === time);

  const openDialog = (table, time) => {
    setSelectedTable(table);
    setSelectedTime(time);
    setForm({ customer_name: '', customer_phone: '', duration_hours: 1, notes: '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    await base44.entities.Reservation.create({
      table_id: selectedTable.id,
      table_name: selectedTable.name,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: selectedTime,
      duration_hours: form.duration_hours,
      notes: form.notes,
      status: 'confirmed',
    });
    queryClient.invalidateQueries({ queryKey: ['reservations'] });
    toast.success(`${selectedTable.name} — ${selectedTime} rezervasiya edildi`);
    setDialogOpen(false);
  };

  const handleCancel = async (id) => {
    await base44.entities.Reservation.update(id, { status: 'cancelled' });
    queryClient.invalidateQueries({ queryKey: ['reservations'] });
    toast.success('Rezervasiya ləğv edildi');
  };

  const pcTables = tables.filter(t => t.type === 'pc');
  const psTables = tables.filter(t => t.type === 'playstation');
  const displayTables = [...pcTables, ...psTables];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Rezervasiyalar</h1>
          <p className="text-sm text-muted-foreground mt-1">Masa rezervasiyasını idarə et</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(d => addDays(d, -7))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-foreground px-2">
            {format(week[0], 'd MMM', { locale: az })} – {format(week[6], 'd MMM', { locale: az })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(d => addDays(d, 7))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week calendar */}
      <div className="grid grid-cols-7 gap-2">
        {week.map(day => {
          const isToday = isSameDay(day, new Date());
          const isSel = isSameDay(day, selectedDate);
          const count = reservations.filter(r => r.date === format(day, 'yyyy-MM-dd') && r.status !== 'cancelled').length;
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={cn(
                "flex flex-col items-center gap-1 py-3 rounded-xl border transition-all",
                isSel ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                  : isToday ? "border-primary/40 text-foreground bg-primary/5"
                    : "border-border text-muted-foreground hover:border-primary/30 hover:bg-secondary"
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide">
                {format(day, 'EEE', { locale: az })}
              </span>
              <span className="text-lg font-bold leading-none">{format(day, 'd')}</span>
              {count > 0 && (
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                  isSel ? "bg-white/20 text-white" : "bg-primary/20 text-primary")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid: tables x time */}
      <Card className="border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {format(selectedDate, 'd MMMM yyyy', { locale: az })} — Masa Cədvəli
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Boş hücrəyə tıklayaraq rezervasiya edin</p>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Header row */}
            <div className="grid border-b border-border bg-secondary/40" style={{ gridTemplateColumns: `80px repeat(${displayTables.length}, 1fr)` }}>
              <div className="p-3 text-xs font-medium text-muted-foreground">Saat</div>
              {displayTables.map(t => (
                <div key={t.id} className="p-3 text-center text-xs font-semibold text-foreground flex flex-col items-center gap-1">
                  {t.type === 'pc'
                    ? <Monitor className="w-4 h-4 text-blue-400" />
                    : <Gamepad2 className="w-4 h-4 text-accent" />}
                  {t.name}
                </div>
              ))}
            </div>
            {/* Time rows */}
            {TIME_SLOTS.map((time, ti) => (
              <div
                key={time}
                className={cn("grid border-b border-border/50 transition-colors hover:bg-secondary/20", ti % 2 === 0 ? '' : 'bg-secondary/10')}
                style={{ gridTemplateColumns: `80px repeat(${displayTables.length}, 1fr)` }}
              >
                <div className="p-3 text-xs text-muted-foreground font-medium">{time}</div>
                {displayTables.map(table => {
                  const res = dayReservations.find(r => r.table_id === table.id && r.start_time === time);
                  const occupied = table.status === 'occupied';
                  return (
                    <div key={table.id} className="p-1.5">
                      {res ? (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-primary/15 border border-primary/30 rounded-lg px-2 py-1.5 text-center group relative"
                        >
                          <p className="text-[10px] font-semibold text-primary truncate">{res.customer_name}</p>
                          <p className="text-[9px] text-muted-foreground">{res.duration_hours}s</p>
                          <button
                            onClick={() => handleCancel(res.id)}
                            className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </button>
                        </motion.div>
                      ) : occupied ? (
                        <div className="bg-secondary/50 border border-border rounded-lg px-2 py-1.5 text-center">
                          <p className="text-[10px] text-muted-foreground">Aktiv</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => openDialog(table, time)}
                          className="w-full h-full min-h-[40px] rounded-lg border border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center group"
                        >
                          <Plus className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Today's reservations list */}
      {dayReservations.length > 0 && (
        <div>
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Gün üçün rezervasiyalar ({dayReservations.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {dayReservations.map(res => (
                <motion.div key={res.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className="p-4 border-border hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-[10px]">{res.table_name}</Badge>
                          <Badge className="text-[10px] bg-primary/15 text-primary border-0">{res.start_time}</Badge>
                        </div>
                        <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />{res.customer_name}
                        </p>
                        {res.customer_phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3" />{res.customer_phone}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{res.duration_hours} saat</p>
                        {res.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{res.notes}"</p>}
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive shrink-0" onClick={() => handleCancel(res.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" />
              Rezervasiya Et
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-primary/8 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
              {selectedTable?.type === 'pc'
                ? <Monitor className="w-5 h-5 text-blue-400" />
                : <Gamepad2 className="w-5 h-5 text-accent" />}
              <div>
                <p className="font-semibold text-foreground text-sm">{selectedTable?.name}</p>
                <p className="text-xs text-muted-foreground">{format(selectedDate, 'd MMM', { locale: az })} — {selectedTime}</p>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Müştəri adı *</Label>
              <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="Ad Soyad" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Telefon</Label>
              <Input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="+994 ..." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Müddət (saat)</Label>
              <Select value={String(form.duration_hours)} onValueChange={v => setForm(f => ({ ...f, duration_hours: Number(v) }))}>
                <SelectTrigger className="bg-secondary border-border mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6].map(h => <SelectItem key={h} value={String(h)}>{h} saat</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Qeyd</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="bg-secondary border-border mt-1" placeholder="Əlavə məlumat..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Ləğv et</Button>
            <Button onClick={handleSave} disabled={!form.customer_name} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Rezervasiya et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}