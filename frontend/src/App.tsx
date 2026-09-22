import { useState } from "react";
import { Route, Routes, NavLink, Navigate, Outlet } from "react-router-dom";
import { X } from "lucide-react";

import { Sidebar, NAV_ITEMS } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { AppMark } from "./components/layout/AppMark";
import { Toaster } from "./components/ui/toast";

import AuthLayout from "./components/layout/AuthLayout";
import LoginPage from "./pages/Login";

import Dashboard from "./pages/Dashboard";
import AssetManager from "./pages/AssetManager";
import Systems from "./pages/Systems";
import Inventory from "./pages/Inventory";
import EmployeeList from "./pages/EmployeeList";
import Reports from "./pages/Reports";
import UsersRoles from "./pages/UsersRoles";
import SettingsPage from "./pages/Settings";

import { useAuth } from "./services/context/AuthContext";
import { cn } from "./lib/utils";

import "./index.css";

// ============================================================
// APPLICATION SHELL
// ============================================================

function ApplicationLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* ======================================================
          DESKTOP SIDEBAR
      ====================================================== */}

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((current) => !current)}
      />

      {/* ======================================================
          MOBILE SIDEBAR
      ====================================================== */}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-scrim"
            onClick={() => setMobileOpen(false)}
          />

          <div className="absolute left-0 top-0 flex h-full w-sidebar flex-col border-r border-sidebar-border bg-sidebar shadow-overlay">
            <div className="flex h-header shrink-0 items-center justify-between border-b border-sidebar-border px-4">
              <div className="flex items-center gap-2.5">
                <AppMark size="sm" />

                <span className="text-sm font-semibold tracking-tight">
                  ITAM
                </span>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMobileMenu={() => setMobileOpen(true)} />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ============================================================
// ROUTE GUARDS
// ============================================================

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* ================================================
            AUTH
        ================================================= */}

        <Route element={<RequireGuest />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
        </Route>

        {/* ================================================
            APPLICATION
        ================================================= */}

        <Route element={<RequireAuth />}>
          <Route element={<ApplicationLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/asset-manager" element={<AssetManager />} />
            <Route path="/systems" element={<Systems />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users-roles" element={<UsersRoles />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </>
  );
}
