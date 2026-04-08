import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Monitor, Coffee, BarChart3, Settings, LayoutDashboard, Warehouse, ShieldAlert, Receipt, DollarSign, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/owner', label: 'Owner', icon: Crown, roles: ['owner'] },
  { path: '/', label: 'Panel', icon: LayoutDashboard, roles: ['admin', 'user'] },
  { path: '/tables', label: 'Masalar', icon: Monitor, roles: ['admin', 'user'] },
  { path: '/cashier', label: 'Kassir', icon: Receipt, roles: ['admin', 'user'] },
  { path: '/products', label: 'Məhsul', icon: Coffee, roles: ['admin'] },
  { path: '/reports', label: 'Hesabat', icon: BarChart3, roles: ['admin'] },
  { path: '/settings', label: 'Tənzim', icon: Settings, roles: ['admin'] },
];

export default function MobileNav({ userRole }) {
  const location = useLocation();
  const filtered = navItems.filter(item => item.roles.includes(userRole || 'user'));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex justify-around items-center h-16">
        {filtered.slice(0, 6).map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path} className="flex flex-col items-center gap-1 px-2 py-1">
              <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px] font-medium", isActive ? "text-primary" : "text-muted-foreground")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}