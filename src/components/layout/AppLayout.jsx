import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import NotificationSystem from '../notifications/NotificationSystem';
import CustomerOrderNotifications from '../notifications/CustomerOrderNotifications';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

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

      {/* Notification System */}
      <NotificationSystem />
      <CustomerOrderNotifications />
    </div>
  );
}