import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { useClub, fetchClubEntities } from '@/hooks/useClub';
import { Monitor, Gamepad2, Tv2, Clock, TrendingUp, Activity, Wifi, Star, BarChart2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

function formatTime(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor(totalSeconds % 3600 / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const catIcons = { computer: Monitor, playstation: Gamepad2, cabinet: Gamepad2, simulator: Tv2 };

function LiveTableMini({ table, session }) {
  const [remaining, setRemaining] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const isOccupied = table.status === 'occupied' && session;
  const Icon = catIcons[table.category] || Monitor;

  useEffect(() => {
    if (!isOccupied || session?.status === 'paused') return;
    if (session?.is_unlimited) {
      const pausedMs = (session.total_paused_minutes || 0) * 60000;
      const update = () => setElapsed(Math.max(0, Math.floor((new Date() - new Date(session.start_time) - pausedMs) / 1000)));
      update();
      const iv = setInterval(update, 1000);
      return () => clearInterval(iv);
    }
    if (!session?.end_time) return;
    const update = () => setRemaining(Math.max(0, Math.floor((new Date(session.end_time) - new Date()) / 1000)));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [isOccupied, session?.end_time, session?.is_unlimited, session?.start_time, session?.status, session?.total_paused_minutes]);

  const isDanger = remaining !== null && remaining <= 300;
  const isWarning = remaining !== null && remaining > 300 && remaining <= 600;
  const totalCost = session ? ((session.session_cost || 0) + (session.orders_cost || 0)).toFixed(2) : null;

  return (
    <div className={cn(
      "rounded-2xl border p-4 transition-all duration-300",
      isOccupied
        ? isDanger ? "border-red-500/40 bg-red-500/5"
        : isWarning ? "border-yellow-500/40 bg-yellow-500/5"
        : "border-blue-500/30 bg-blue-500/5"
        : "border-gray-700/50 bg-gray-900/40"
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center",
            isOccupied ? "bg-blue-500/10" : "bg-gray-800"
          )}>
            <Icon className={cn("w-4 h-4", isOccupied ? "text-blue-400" : "text-gray-600")} />
          </div>
          <span className="text-sm font-bold text-white">{table.name}</span>
        </div>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full",
          isOccupied ? isDanger ? "bg-red-500/20 text-red-400"
            : isWarning ? "bg-yellow-500/20 text-yellow-400"
            : "bg-green-500/20 text-green-400"
          : "bg-gray-700 text-gray-500"
        )}>
          {isOccupied ? (isDanger ? 'BİTİR' : isWarning ? 'AZ QALDI' : 'AKTİV') : 'BOŞ'}
        </span>
      </div>

      {isOccupied && (
        <div className="space-y-2">
          <p className={cn("text-xl font-mono font-black text-center",
            isDanger ? "text-red-400" : isWarning ? "text-yellow-400" :
            session?.is_unlimited ? "text-purple-400" : "text-blue-400"
          )}>
            {session?.is_unlimited ? formatTime(elapsed) : remaining !== null ? formatTime(remaining) : '--:--:--'}
          </p>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{session?.is_unlimited ? '∞ Limitsiz' : 'Qalan vaxt'}</span>
            <span className="text-white font-semibold">{totalCost} ₼</span>
          </div>
        </div>
      )}

      {!isOccupied && (
        <div className="text-center py-2">
          <p className="text-xs text-gray-600">{table.hourly_rate} ₼/saat</p>
        </div>
      )}
    </div>
  );
}

export default function LiveDashboard() {
  const { user } = useOutletContext();
  const { clubOwnerId } = useClub(user);
  const queryClient = useQueryClient();
  const todayInterval = useMemo(() => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }), []);

  useEffect(() => {
    if (!clubOwnerId) return;
    const unsubTable = base44.entities.GameTable.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['live-tables', clubOwnerId] });
    });
    const unsubSession = base44.entities.Session.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['live-sessions', clubOwnerId] });
      queryClient.invalidateQueries({ queryKey: ['live-completed', clubOwnerId] });
    });
    return () => { unsubTable(); unsubSession(); };
  }, [clubOwnerId, queryClient]);

  const { data: tables = [] } = useQuery({
    queryKey: ['live-tables', clubOwnerId],
    queryFn: () => user ? fetchClubEntities(base44.entities.GameTable, user, {}, 'order_number') : [],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: activeSessions = [] } = useQuery({
    queryKey: ['live-sessions', clubOwnerId],
    queryFn: async () => {
      if (!user) return [];
      const all = await fetchClubEntities(base44.entities.Session, user, {}, '-created_date', 100);
      return all.filter(s => s.status === 'active' || s.status === 'paused');
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  const { data: completedSessions = [] } = useQuery({
    queryKey: ['live-completed', clubOwnerId],
    queryFn: () => user ? fetchClubEntities(base44.entities.Session, user, { status: 'completed' }, '-created_date', 200) : [],
    enabled: !!user,
  });

  const sessionMap = {};
  activeSessions.forEach(s => { sessionMap[s.table_id] = s; });

  const todaySessions = useMemo(() =>
    completedSessions.filter(s => {
      try { return isWithinInterval(new Date(s.created_date), todayInterval); } catch { return false; }
    }), [completedSessions, todayInterval]);

  const todayRevenue = todaySessions.reduce((a, s) => a + (s.total_cost || 0), 0);
  const occupied = tables.filter(t => t.status === 'occupied').length;
  const available = tables.filter(t => t.status === 'available').length;

  // Most active table today
  const tableRevenue = {};
  todaySessions.forEach(s => {
    tableRevenue[s.table_name] = (tableRevenue[s.table_name] || 0) + (s.total_cost || 0);
  });
  const topTable = Object.entries(tableRevenue).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    { label: 'Bugünkü Gəlir', value: `${todayRevenue.toFixed(2)} ₼`, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'Aktiv Masalar', value: `${occupied} / ${tables.length}`, icon: Activity, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { label: 'Boş Masalar', value: available, icon: Monitor, color: 'text-gray-400', bg: 'bg-gray-700/30', border: 'border-gray-700' },
    { label: 'Sessiyalar', value: todaySessions.length, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { label: 'Ən çox işləyən', value: topTable ? topTable[0] : '—', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    { label: 'Canlı İzləmə', value: format(new Date(), 'HH:mm'), icon: Wifi, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">Canlı Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Real-time • {format(new Date(), 'dd MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-semibold text-green-400">Canlı</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(stat => (
          <div key={stat.label} className={cn("rounded-2xl border p-4", stat.bg, stat.border)}>
            <stat.icon className={cn("w-5 h-5 mb-2", stat.color)} />
            <p className={cn("text-xl font-black", stat.color)}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Live Tables Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-blue-400" />
          <h2 className="font-bold text-foreground">Bütün Masalar — Canlı</h2>
          <span className="ml-2 text-xs text-muted-foreground">{tables.length} masa</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {tables.map(table => (
            <LiveTableMini
              key={table.id}
              table={table}
              session={sessionMap[table.id]}
            />
          ))}
        </div>
      </div>

      {/* Today's Activity */}
      {activeSessions.length > 0 && (
        <div className="rounded-2xl border border-gray-700/50 bg-card p-5">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-400" /> Aktiv Sessiyalar
          </h3>
          <div className="space-y-2">
            {activeSessions.map(session => {
              const t = tables.find(t => t.id === session.table_id);
              return (
                <div key={session.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-secondary/50 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-semibold text-foreground">{session.table_name}</span>
                    {session.customer_name && <span className="text-xs text-muted-foreground">• {session.customer_name}</span>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">{((session.session_cost || 0) + (session.orders_cost || 0)).toFixed(2)} ₼</p>
                    <p className="text-xs text-muted-foreground">{session.is_unlimited ? '∞ Limitsiz' : `${session.duration_minutes} dəq`}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}