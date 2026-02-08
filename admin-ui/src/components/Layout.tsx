import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Users,
  BookOpen,
  Settings,
  LogOut,
} from 'lucide-react';
import { logout } from '../lib/auth';
import { KillSwitchBanner } from './KillSwitchBanner';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/escalations', icon: AlertTriangle, label: 'Escalations' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/knowledge', icon: BookOpen, label: 'Knowledge' },
  { to: '/config', icon: Settings, label: 'Config' },
];

export function Layout() {
  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="flex w-56 shrink-0 flex-col border-r border-border bg-surface-1">
        <div className="border-b border-border px-5 py-4">
          <h1 className="text-lg font-bold text-text-primary">Maribel</h1>
          <p className="text-xs text-text-muted">Admin Panel</p>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <KillSwitchBanner />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
