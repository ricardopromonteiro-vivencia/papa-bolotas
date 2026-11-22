/**
 * AppLayout - Main navigation shell
 * 
 * Persistent sidebar on desktop, bottom nav on mobile.
 */

import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SyncStatusIndicator } from '@/components/sync';
import {
  ShoppingCart,
  Package,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from './BrandLogo';

const NAV_ITEMS = [
  { to: '/pos',      icon: ShoppingCart, label: 'Vendas'    },
  { to: '/stock',    icon: Package,      label: 'Stock'     },
  { to: '/reports',  icon: BarChart2,    label: 'Relatórios'},
  { to: '/settings', icon: Settings,     label: 'Definições'},
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Desktop Sidebar ── */}
      <aside className={cn(
        "hidden md:flex flex-col bg-white border-r border-gray-200 shrink-0 transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-56"
      )}>
        {/* Logo */}
        <div className={cn(
          "border-b border-gray-100 flex items-center",
          sidebarCollapsed ? "flex-col gap-2 p-2 py-3" : "justify-between gap-2 p-3"
        )}>
          {sidebarCollapsed ? (
            <BrandLogo showName={false} size="sm" />
          ) : (
            <div className="min-w-0">
              <h1><BrandLogo /></h1>
              <p className="text-xs text-gray-500 mt-0.5 truncate">{user?.username}</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              "p-2 rounded-lg hover:bg-gray-100 transition-colors",
              sidebarCollapsed && "mx-auto"
            )}
            title={sidebarCollapsed ? "Expandir menu" : "Colapsar menu"}
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  sidebarCollapsed && 'justify-center'
                )
              }
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 space-y-2">
          {!sidebarCollapsed && <SyncStatusIndicator size="sm" />}
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors",
              sidebarCollapsed && "justify-center"
            )}
            title={sidebarCollapsed ? "Terminar Sessão" : undefined}
          >
            <LogOut className="h-4 w-4" />
            {!sidebarCollapsed && "Terminar Sessão"}
          </button>
        </div>
      </aside>

      {/* ── Mobile Header + Drawer ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <h1><BrandLogo size="sm" /></h1>
          <button onClick={() => setSidebarOpen(true)} className="p-2">
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Mobile drawer overlay */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative z-50 w-64 bg-white flex flex-col h-full shadow-xl">
              <div className="flex items-center justify-between p-4 border-b">
                <h1><BrandLogo size="sm" /></h1>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 p-3 space-y-1">
                {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-orange-100 text-orange-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="p-3 border-t space-y-2">
                <SyncStatusIndicator size="sm" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="h-4 w-4" />
                  Terminar Sessão
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-gray-200 bg-white">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors',
                  isActive ? 'text-orange-600' : 'text-gray-500'
                )
              }
            >
              <Icon className="h-5 w-5 mb-0.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default AppLayout;
