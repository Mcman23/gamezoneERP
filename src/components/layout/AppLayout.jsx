import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useClub } from '@/hooks/useClub';
import Sidebar from './Sidebar';
import { useSubscription } from '@/hooks/useSubscription';
import SubscriptionRequired from '@/pages/SubscriptionRequired';
import MobileNav from './MobileNav';
import NotificationSystem from '../notifications/NotificationSystem';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const { hasSubscription, isLoading: subLoading } = useSubscription(user);
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

  // Subscription check disabled

  // Owner: redirect from default dashboard to owner panel
  // (handled via routing — owner sees only /owner route)

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
        <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
          <Outlet context={{ user }} />
        </div>
      </main>

      <NotificationSystem clubOwnerId={clubOwnerId} />
    </div>
  );
}