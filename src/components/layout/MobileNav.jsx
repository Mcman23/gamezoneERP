import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Monitor, Coffee, BarChart3, Settings, LayoutDashboard, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: 'Panel', icon: Monitor, roles: ['admin', 'user'] },
  { path: '/salon-layout', label: 'Salon', icon: LayoutDashboard, roles: ['admin', 'user'] },
  { path: '/reservations', label: 'Rezerv', icon: CalendarDays, roles: ['admin', 'user'] },
  { path: '/products', label: 'Məhsullar', icon: Coffee, roles: ['admin'] },
  { path: '/reports', label: 'Hesabat', icon: BarChart3, roles: ['admin'] },
  { path: '/settings', label: 'Tənzim', icon: Settings, roles: ['admin'] },
];

export default function MobileNav({ userRole }) {
  const location = useLocation();
  const filtered = navItems.filter(item => item.roles.includes(userRole || 'user'));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex justify-around items-center h-16">
        {filtered.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center gap-1 px-3 py-1">
              <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}