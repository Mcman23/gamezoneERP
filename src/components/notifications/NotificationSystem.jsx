import React, { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

function playBeep(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type === 'danger' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(type === 'danger' ? 880 : 660, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

export default function NotificationSystem({ clubOwnerId }) {
  const [notifications, setNotifications] = useState([]);
  const notifiedRef = useRef(new Set());

  const { data: sessions = [] } = useQuery({
    queryKey: ['active-sessions-notify', clubOwnerId],
    queryFn: () => clubOwnerId
      ? base44.entities.Session.filter({ status: 'active', club_owner_id: clubOwnerId })
      : [],
    enabled: !!clubOwnerId,
    refetchInterval: 15000,
  });

  useEffect(() => {
    const now = new Date();
    sessions.forEach(session => {
      if (!session.end_time) return;
      const endTime = new Date(session.end_time);
      const diffMin = (endTime - now) / 60000;

      if (diffMin <= 10 && diffMin > 5 && !notifiedRef.current.has(`${session.id}-10`)) {
        notifiedRef.current.add(`${session.id}-10`);
        setNotifications(prev => [...prev, {
          id: `${session.id}-10`,
          table: session.table_name,
          minutes: 10,
          type: 'warning',
          time: new Date()
        }]);
      }

      if (diffMin <= 5 && diffMin > 0 && !notifiedRef.current.has(`${session.id}-5`)) {
        notifiedRef.current.add(`${session.id}-5`);
        playBeep('danger');
        setNotifications(prev => [...prev, {
          id: `${session.id}-5`,
          table: session.table_name,
          minutes: 5,
          type: 'danger',
          time: new Date()
        }]);
      }

      if (diffMin <= 0 && !notifiedRef.current.has(`${session.id}-0`)) {
        notifiedRef.current.add(`${session.id}-0`);
        playBeep('danger');
        setNotifications(prev => [...prev, {
          id: `${session.id}-0`,
          table: session.table_name,
          minutes: 0,
          type: 'expired',
          time: new Date()
        }]);
      }
    });
  }, [sessions]);

  const dismiss = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className={`pointer-events-auto rounded-xl p-4 border backdrop-blur-sm ${
              n.type === 'danger' || n.type === 'expired'
                ? 'bg-destructive/10 border-destructive/30 danger-pulse'
                : 'bg-yellow-500/10 border-yellow-500/30 warning-pulse'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                n.type === 'danger' || n.type === 'expired' ? 'bg-destructive/20' : 'bg-yellow-500/20'
              }`}>
                {n.type === 'expired' ? (
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                ) : (
                  <Clock className={`w-5 h-5 ${n.type === 'danger' ? 'text-destructive' : 'text-yellow-500'}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{n.table}</p>
                <p className={`text-xs mt-0.5 ${
                  n.type === 'danger' || n.type === 'expired' ? 'text-destructive' : 'text-yellow-500'
                }`}>
                  {n.type === 'expired' ? 'Vaxt bitdi!' : `Vaxtın bitməsinə ${n.minutes} dəq qalıb!`}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => dismiss(n.id)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}