import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useClub } from '@/hooks/useClub';
import Sidebar from './Sidebar';
import { useSubscription } from '@/hooks/useSubscription';
import MobileNav from './MobileNav';
import NotificationSystem from '../notifications/NotificationSystem';
import { cn } from '@/lib/utils';
import { AlertTriangle, Lock } from 'lucide-react';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const { hasSubscription, isLoading: subLoading, daysUntilExpiry } = useSubscription(user);
  const { clubOwnerId } = useClub(user);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  // Redirect owner to /owner panel, away from admin pages
  useEffect(() => {
    if (user?.role === 'owner' && location.pathname !== '/owner') {
      navigate('/owner', { replace: true });
    }
  }, [user, location.pathname]);

  // Gate admin users without active subscription
  if (!subLoading && user?.role === 'admin' && !hasSubscription) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Abunəliyiniz yoxdur</h1>
        <p className="text-muted-foreground mb-1">Abunəliyiniz yoxdur və ya müddəti bitib.</p>
        <p className="text-sm text-muted-foreground">Zəhmət olmasa sistem sahibi ilə əlaqə saxlayın.</p>
        <button onClick={() => base44.auth.logout()} className="mt-6 px-4 py-2 rounded-lg bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors">Çıxış</button>
      </div>
    );
  }

  const warningBanner = hasSubscription && daysUntilExpiry !== null && daysUntilExpiry <= 7;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} userRole={user?.role} />
      </div>

      {/* Mobile nav */}
      <div className="md:hidden">
        <MobileNav userRole={user?.role} />
      </div>

      {/* Main content */}
      <main className={cn(
        "transition-all duration-300 pb-20 md:pb-0",
        collapsed ? "md:ml-16" : "md:ml-60"
      )}>
        {warningBanner && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-yellow-500 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Abunəliyiniz <strong>{daysUntilExpiry} gün</strong> sonra bitir. Uzatmaq üçün sistem sahibi ilə əlaqə saxlayın.
          </div>
        )}
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          <Outlet context={{ user }} />
        </div>
      </main>

      <NotificationSystem clubOwnerId={clubOwnerId} />
    </div>
  );
}