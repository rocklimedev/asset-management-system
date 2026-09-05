import { useState } from "react";
import {
  Route,
  Routes,
  NavLink,
  Navigate,
  Outlet,
} from "react-router-dom";

import {
  X,
  LayoutGrid,
  Boxes,
  Archive,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";

import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { ToastViewport } from "./components/ui/Toast";

import AuthLayout from "./components/layout/AuthLayout";
import LoginPage from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import AssetManager from "./pages/AssetManager";
import Inventory from "./pages/Inventory";
import UsersRoles from "./pages/UsersRoles";
import SettingsPage from "./pages/Settings";

import { useAuth } from "./services/context/AuthContext";

import "./index.css";

const MOBILE_NAV = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutGrid,
    end: true,
  },
  {
    to: "/asset-manager",
    label: "Asset Manager",
    icon: Boxes,
  },
  {
    to: "/inventory",
    label: "Inventory",
    icon: Archive,
  },
  {
    to: "/users-roles",
    label: "Users & Roles",
    icon: Users,
  },
  {
    to: "/settings",
    label: "Settings",
    icon: SettingsIcon,
  },
];

// ============================================================
// APPLICATION SHELL (sidebar + header + nested app routes)
// ============================================================

function ApplicationLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
      />

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
              <span className="text-sm font-semibold">
                ITAM
              </span>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-1 hover:bg-slate-100"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
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
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`
                  }
                >
                  <item.icon className="h-4.5 w-4.5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Application Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMobileMenu={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          {/* Nested app routes render here via Outlet */}
          <Outlet />
        </main>
      </div>

      <ToastViewport />
    </div>
  );
}

// ============================================================
// ROUTE GUARDS
// ============================================================
// Wrapping guards as small components keeps the Routes tree
// stable across auth-state changes — React reconciles instead
// of unmounting/remounting the whole tree each time.

function RequireAuth() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function RequireGuest() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}

// ============================================================
// APP
// ============================================================

export default function App() {
  const { loading } = useAuth();

  /*
   * IMPORTANT:
   * Wait until AuthContext has restored the token
   * from localStorage before rendering any routes.
   */
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* =========================================
          AUTH ROUTES (only reachable when logged out)
      ========================================= */}
      <Route element={<RequireGuest />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
      </Route>

      {/* =========================================
          APPLICATION ROUTES (only reachable when logged in)
      ========================================= */}
      <Route element={<RequireAuth />}>
        <Route element={<ApplicationLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/asset-manager" element={<AssetManager />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/users-roles" element={<UsersRoles />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Fallback for unmatched paths */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}