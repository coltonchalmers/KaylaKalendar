import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  CalendarPlus,
  Link2,
  List,
  Settings,
  LogOut,
  Menu,
  X,
  CalendarClock,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { classNames } from '@/lib/utils';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/availability', icon: Clock, label: 'Availability' },
  { to: '/admin/bookings/new', icon: CalendarPlus, label: 'Manual Booking' },
  { to: '/admin/meeting-types', icon: CalendarClock, label: 'Meeting Types' },
  { to: '/admin/recurring-links', icon: Link2, label: 'Recurring Links' },
  { to: '/admin/proposals', icon: CalendarCheck, label: 'Proposal Links' },
  { to: '/admin/bookings', icon: List, label: 'All Bookings' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={classNames(
          'fixed inset-y-0 left-0 z-50 w-64 bg-jungo-brown-700 text-white flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-5 flex items-center gap-3 border-b border-jungo-brown-600">
          <img
            src="/Jungo_logo_greenbrown_no_background.png"
            alt="Jungo Solutions"
            className="h-9 w-auto brightness-200"
          />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">Jungo Solutions</h1>
            <p className="text-xs text-jungo-brown-300">Admin Panel</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1 hover:bg-jungo-brown-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                classNames(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-jungo-brown-600 text-white'
                    : 'text-jungo-brown-200 hover:bg-jungo-brown-600 hover:text-white'
                )
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-jungo-brown-600">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-jungo-brown-200 hover:bg-jungo-brown-600 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-semibold text-jungo-brown-700">Jungo Solutions</h1>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
