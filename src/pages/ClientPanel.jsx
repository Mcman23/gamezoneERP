import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Clock, Gamepad2, Monitor, Tv2, ShoppingBag, Receipt, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTime(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor(totalSeconds % 3600 / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const catIcons = { computer: Monitor, playstation: Gamepad2, cabinet: Gamepad2, simulator: Tv2 };
const catLabels = { computer: 'PC', playstation: 'PlayStation', cabinet: 'Kabinet VIP', simulator: 'Simulator' };

export default function ClientPanel() {
  const { tableId } = useParams();

  const [table, setTable] = useState(null);
  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [remaining, setRemaining] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchData = useCallback(async () => {
    if (!tableId) return;
    try {
      // Fetch by ID directly — most reliable
      const tables = await base44.entities.GameTable.filter({ id: tableId });
      if (!tables || tables.length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const found = tables[0];
      setTable(found);
      setNotFound(false);

      if (found.status === 'occupied' && found.current_session_id) {
        const sessions = await base44.entities.Session.filter({ id: found.current_session_id });
        if (sessions.length > 0) {
          const sess = sessions[0];
          setSession(sess);
          const tableOrders = await base44.entities.Order.filter({ session_id: sess.id });
          setOrders(tableOrders.filter(o => o.status !== 'cancelled'));
        } else {
          setSession(null);
          setOrders([]);
        }
      } else {
        setSession(null);
        setOrders([]);
      }
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Real-time subscriptions
  useEffect(() => {
    const unsubTable = base44.entities.GameTable.subscribe(fetchData);
    const unsubSession = base44.entities.Session.subscribe(fetchData);
    const unsubOrder = base44.entities.Order.subscribe(fetchData);
    return () => { unsubTable(); unsubSession(); unsubOrder(); };
  }, [fetchData]);

  // Timer
  useEffect(() => {
    if (!session || session.status !== 'active') {
      setRemaining(null);
      return;
    }
    if (session.is_unlimited) {
      const pausedMs = (session.total_paused_minutes || 0) * 60000;
      const update = () => {
        const totalMs = new Date() - new Date(session.start_time);
        setElapsed(Math.max(0, Math.floor((totalMs - pausedMs) / 1000)));
      };
      update();
      const iv = setInterval(update, 1000);
      return () => clearInterval(iv);
    }
    if (!session.end_time) return;
    const update = () => setRemaining(Math.max(0, Math.floor((new Date(session.end_time) - new Date()) / 1000)));
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [session]);

  const totalOrders = orders.reduce((a, o) => a + (o.total_amount || 0), 0);
  const sessionCost = session?.session_cost || 0;
  const totalBill = (sessionCost + totalOrders).toFixed(2);

  const isDanger = remaining !== null && remaining <= 300 && remaining > 0;
  const isWarning = remaining !== null && remaining > 300 && remaining <= 600;
  const Icon = catIcons[table?.category] || Monitor;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Yüklənir...</p>
        </div>
      </div>
    );
  }

  if (notFound || !table) {
    return (
      <div className="min-h-screen bg-[#0a0d1a] flex flex-col items-center justify-center text-white gap-4">
        <div className="w-20 h-20 rounded-3xl bg-gray-800 flex items-center justify-center mb-2">
          <Monitor className="w-10 h-10 text-gray-600" />
        </div>
        <p className="text-xl font-bold text-gray-400">Masa tapılmadı</p>
        <p className="text-sm text-gray-600">Bu link artıq etibarlı deyil</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0d1a] text-white p-4 md:p-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Icon className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{table.name}</h1>
            <p className="text-sm text-gray-500">
              {catLabels[table.category] || table.category}
              {table.zone === 'cabinet' ? ' • Kabinet' : ' • Zal'}
            </p>
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
          online
            ? "bg-green-500/10 text-green-400 border-green-500/20"
            : "bg-red-500/10 text-red-400 border-red-500/20"
        )}>
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {online ? 'Canlı' : 'Offline'}
        </div>
      </div>

      {/* Status: Available */}
      {table.status !== 'occupied' ? (
        <div className="rounded-2xl border border-gray-700/50 bg-gray-900/50 p-10 text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-xl font-bold text-green-400 mb-1">Masa Boşdur</p>
          <p className="text-sm text-gray-500">Kassirə müraciət edin</p>
        </div>
      ) : (
        <>
          {/* Timer Card */}
          <div className={cn(
            "rounded-2xl border p-6 mb-4 text-center",
            isDanger ? "border-red-500/30 bg-red-500/5" :
            isWarning ? "border-yellow-500/30 bg-yellow-500/5" :
            session?.is_unlimited ? "border-purple-500/30 bg-purple-500/5" :
            "border-blue-500/30 bg-blue-500/5"
          )}>
            <p
              className="text-[10px] uppercase tracking-widest font-bold mb-3 letter-spacing-wider"
              style={{ color: isDanger ? '#f87171' : isWarning ? '#facc15' : session?.is_unlimited ? '#c084fc' : '#60a5fa' }}
            >
              {session?.is_unlimited ? '⏱ Keçən Vaxt' : isDanger ? '⚠️ Vaxt Bitir' : '⏳ Qalan Vaxt'}
            </p>
            <p className={cn(
              "text-5xl font-mono font-black tracking-wider tabular-nums",
              isDanger ? "text-red-400" :
              isWarning ? "text-yellow-400" :
              session?.is_unlimited ? "text-purple-400" : "text-blue-400"
            )}>
              {session?.is_unlimited
                ? formatTime(elapsed)
                : remaining !== null ? formatTime(remaining) : '--:--:--'}
            </p>
            {isDanger && (
              <p className="text-xs text-red-400 mt-3 animate-pulse font-semibold">
                Vaxtınız tükənmək üzrədir!
              </p>
            )}
            {session?.status === 'paused' && (
              <p className="text-xs text-yellow-400 mt-3 font-semibold">⏸ Fasilə verildi</p>
            )}
          </div>

          {/* Bill Summary */}
          <div className="rounded-2xl border border-gray-700/50 bg-gray-900/50 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-gray-200">Hesab</span>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sessiya haqqı</span>
                <span className="text-white font-medium">{sessionCost.toFixed(2)} ₼</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sifarişlər</span>
                <span className="text-white font-medium">{totalOrders.toFixed(2)} ₼</span>
              </div>
              <div className="border-t border-gray-700/60 pt-3 flex justify-between items-center">
                <span className="font-bold text-white">Ümumi</span>
                <span className="font-black text-2xl text-blue-400">{totalBill} ₼</span>
              </div>
            </div>
          </div>

          {/* Orders List */}
          {orders.length > 0 && (
            <div className="rounded-2xl border border-gray-700/50 bg-gray-900/50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingBag className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-gray-200">Sifarişlər</span>
                <span className="ml-auto text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
                  {orders.length} ədəd
                </span>
              </div>
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/30">
                    <div className="space-y-1.5">
                      {(order.items || []).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-300">
                            {item.product_name}
                            <span className="text-gray-600 ml-1">×{item.quantity}</span>
                          </span>
                          <span className="text-white font-medium">{(item.total_price || 0).toFixed(2)} ₼</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-700/50 mt-2 pt-2 flex justify-between text-xs">
                      <span className="text-gray-600">Cəmi</span>
                      <span className="text-purple-400 font-semibold">{(order.total_amount || 0).toFixed(2)} ₼</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="text-center mt-8 pb-4">
        <p className="text-xs text-gray-700">Playroom • {table.name} • Real-time yenilənir</p>
      </div>
    </div>
  );
}