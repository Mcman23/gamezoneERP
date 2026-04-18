import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, Gamepad2, Monitor, Tv2, ShoppingBag, Receipt, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatTime(totalSeconds) {
  if (totalSeconds <= 0) return '00:00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor(totalSeconds % 3600 / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const catIcons = { computer: Monitor, playstation: Gamepad2, cabinet: Gamepad2, simulator: Tv2 };
const catLabels = { computer: 'PC', playstation: 'PlayStation', cabinet: 'Kabinet VIP', simulator: 'Simulator' };

export default function ClientPanel() {
  const pathParts = window.location.pathname.split('/');
  const tableOrderFromPath = pathParts[pathParts.length - 1];
  const tableOrder = parseInt(tableOrderFromPath) || 1;

  const [table, setTable] = useState(null);
  const [session, setSession] = useState(null);
  const [orders, setOrders] = useState([]);
  const [remaining, setRemaining] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);

  const fetchData = async () => {
    try {
      const tables = await base44.entities.GameTable.list('order_number', 100);
      const found = tables.find(t => t.order_number === tableOrder);
      if (!found) { setLoading(false); return; }
      setTable(found);

      if (found.status === 'occupied' && found.current_session_id) {
        const sessions = await base44.entities.Session.filter({ id: found.current_session_id });
        if (sessions.length > 0) {
          setSession(sessions[0]);
          const sess = sessions[0];
          const tableOrders = await base44.entities.Order.filter({ session_id: sess.id });
          setOrders(tableOrders.filter(o => o.status !== 'cancelled'));
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
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [tableOrder]);

  // Real-time subscriptions
  useEffect(() => {
    const unsubTable = base44.entities.GameTable.subscribe(() => fetchData());
    const unsubSession = base44.entities.Session.subscribe(() => fetchData());
    const unsubOrder = base44.entities.Order.subscribe(() => fetchData());
    return () => { unsubTable(); unsubSession(); unsubOrder(); };
  }, [tableOrder]);

  // Timer
  useEffect(() => {
    if (!session || session.status !== 'active') return;
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
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!table) {
    return (
      <div className="min-h-screen bg-[#0a0d1a] flex flex-col items-center justify-center text-white gap-4">
        <Monitor className="w-16 h-16 text-gray-600" />
        <p className="text-xl font-bold text-gray-400">Masa #{tableOrder} tapılmadı</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0d1a] text-white p-4 md:p-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Icon className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">{table.name}</h1>
            <p className="text-sm text-gray-500">{catLabels[table.category]} • {table.zone === 'cabinet' ? 'Kabinet' : 'Zal'}</p>
          </div>
        </div>
        <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold",
          online ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
        )}>
          {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {online ? 'Canlı' : 'Offline'}
        </div>
      </div>

      {/* Status */}
      {table.status !== 'occupied' ? (
        <div className="rounded-2xl border border-gray-700/50 bg-gray-900/50 p-8 text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-8 h-8 text-green-400" />
          </div>
          <p className="text-xl font-bold text-green-400">Masa Boşdur</p>
          <p className="text-sm text-gray-500 mt-1">Kassirə müraciət edin</p>
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
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{
              color: isDanger ? '#f87171' : isWarning ? '#facc15' : session?.is_unlimited ? '#c084fc' : '#60a5fa'
            }}>
              {session?.is_unlimited ? 'Keçən Vaxt' : isDanger ? '⚠️ Vaxt Bitir' : 'Qalan Vaxt'}
            </p>
            <p className={cn("text-5xl font-mono font-black tracking-wider",
              isDanger ? "text-red-400" : isWarning ? "text-yellow-400" :
              session?.is_unlimited ? "text-purple-400" : "text-blue-400"
            )}>
              {session?.is_unlimited ? formatTime(elapsed) : remaining !== null ? formatTime(remaining) : '--:--:--'}
            </p>
            {isDanger && (
              <p className="text-xs text-red-400 mt-2 animate-pulse">Vaxtınız tükənmək üzrədir!</p>
            )}
          </div>

          {/* Bill Summary */}
          <div className="rounded-2xl border border-gray-700/50 bg-gray-900/50 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-gray-300">Hesab</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sessiya</span>
                <span className="text-white">{sessionCost.toFixed(2)} ₼</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sifarişlər</span>
                <span className="text-white">{totalOrders.toFixed(2)} ₼</span>
              </div>
              <div className="border-t border-gray-700 pt-3 flex justify-between">
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
                <span className="font-semibold text-gray-300">Sifarişlər</span>
                <span className="ml-auto text-xs text-gray-500">{orders.length} sifariş</span>
              </div>
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.id} className="bg-gray-800/50 rounded-xl p-3">
                    <div className="space-y-1.5">
                      {(order.items || []).map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-300">{item.product_name} <span className="text-gray-600">x{item.quantity}</span></span>
                          <span className="text-white">{(item.total_price || 0).toFixed(2)} ₼</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between text-xs">
                      <span className="text-gray-500">Cəmi</span>
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
      <p className="text-center text-xs text-gray-700 mt-8">GameZone • Masa #{tableOrder} • Canlı yenilənir</p>
    </div>
  );
}