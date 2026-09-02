import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { X, LayoutGrid, Boxes, Archive, Users, Settings as SettingsIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ToastViewport } from './components/ui/Toast';
import Dashboard from './pages/Dashboard';
import AssetManager from './pages/AssetManager';
import Inventory from './pages/Inventory';
import UsersRoles from './pages/UsersRoles';
import SettingsPage from './pages/Settings';

const MOBILE_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/asset-manager', label: 'Asset Manager', icon: Boxes },
  { to: '/inventory', label: 'Inventory', icon: Archive },
  { to: '/users-roles', label: 'Users & Roles', icon: Users },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
              <span className="text-sm font-semibold">ITAM</span>
              <button onClick={() => setMobileOpen(false)}><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <nav className="space-y-0.5 px-2 py-3">
              {MOBILE_NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium ${
                      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                    }`
                  }
                >
                  <item.icon className="h-4.5 w-4.5" /> {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/asset-manager" element={<AssetManager />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/users-roles" element={<UsersRoles />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
      <ToastViewport />
    </div>
  );
}
