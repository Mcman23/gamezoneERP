import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Monitor, Gamepad2, Coffee, BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, Warehouse, ShieldAlert, Receipt, DollarSign, Crown, Users, Tv2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const navItems = [
{ path: '/owner', label: 'Owner Panel', icon: Crown, roles: ['owner'] },
{ path: '/', label: 'İdarə Paneli', icon: LayoutDashboard, roles: ['admin'] },
{ path: '/tables', label: 'Masalar', icon: Monitor, roles: ['admin', 'user'] },
{ path: '/cashier', label: 'Kassir Paneli', icon: Receipt, roles: ['admin', 'user'] },
{ path: '/products', label: 'Məhsullar', icon: Coffee, roles: ['admin'] },
{ path: '/inventory', label: 'Anbar', icon: Warehouse, roles: ['admin'] },
{ path: '/expenses', label: 'Xərclər', icon: DollarSign, roles: ['admin'] },
{ path: '/reports', label: 'Hesabatlar', icon: BarChart3, roles: ['admin'] },
{ path: '/customers', label: 'Müştərilər', icon: Users, roles: ['admin'] },
{ path: '/settings', label: 'Tənzimləmələr', icon: Settings, roles: ['admin'] },
{ path: '/admin', label: 'Sistem Paneli', icon: ShieldAlert, roles: ['admin'] },
{ path: '/kiosk-setup', label: 'Kiosk Quraşdırma', icon: Tv2, roles: ['admin'] }];



export default function Sidebar({ collapsed, setCollapsed, userRole }) {
  const location = useLocation();
  const filteredItems = navItems.filter((item) => item.roles.includes(userRole || 'user'));

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full z-40 flex flex-col border-r border-border bg-card transition-all duration-300",
      collapsed ? "w-16" : "w-60"
    )}>
      <div className="flex items-center gap-3 p-4 border-b border-border h-16">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Gamepad2 className="w-5 h-5 text-primary" />
        </div>
        {!collapsed && <span className="text-lg font-bold text-foreground tracking-tight truncate">Game Zone</span>}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link key={item.path} to={item.path}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}>
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                {!collapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
              </div>
            </Link>);

        })}
      </nav>

      <div className="p-2 border-t border-border space-y-1">
        <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="w-full justify-center text-muted-foreground hover:text-foreground">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => base44.auth.logout()} className={cn("w-full text-muted-foreground hover:text-destructive", collapsed ? "justify-center" : "justify-start")}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="ml-2 text-sm">Çıxış</span>}
        </Button>
      </div>
    </aside>);

}