import { Suspense, lazy, useEffect, useState } from "react";
import {
  Route,
  Routes,
  Navigate,
  Outlet,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { X } from "lucide-react";

import { NavList, Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { ROUTE_LABELS } from "./components/layout/nav-config";
import { ConfirmProvider } from "./components/ui/confirm-dialog";
import { AppMark } from "./components/layout/AppMark";
import { Toaster } from "./components/ui/toast";

import AuthLayout from "./components/layout/AuthLayout";
import LoginPage from "./pages/Login";

// Each module loads on first visit, so the sign-in screen and the
// first page open quickly instead of downloading the whole app.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AssetManager = lazy(() => import("./pages/AssetManager"));
const Inventory = lazy(() => import("./pages/Inventory"));
const EmployeeList = lazy(() => import("./pages/EmployeeList"));
const Reports = lazy(() => import("./pages/Reports"));
const UsersRoles = lazy(() => import("./pages/UsersRoles"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const SoftwareList = lazy(() => import("./pages/SoftwareList"));

import { useAuth } from "./services/context/AuthContext";

import "./index.css";

// ============================================================
// APPLICATION SHELL
// ============================================================

function PageLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-full min-h-[50vh] items-center justify-center text-sm text-muted-foreground"
    >
      Loading…
    </div>
  );
}

/** Keeps the browser tab and screen-reader page title in step with the route. */
function useDocumentTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const segment = pathname.split("/").filter(Boolean)[0] ?? "";
    const label = ROUTE_LABELS[segment];

    document.title = label ? `${label} · ITAM` : "ITAM — Asset Management";
  }, [pathname]);
}

function ApplicationLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useDocumentTitle();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>

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
        <MobileNavDrawer onClose={() => setMobileOpen(false)} />
      )}

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMobileMenu={() => setMobileOpen(true)} />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto outline-none"
        >
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// MOBILE NAV DRAWER
// ============================================================

function MobileNavDrawer({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-scrim" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        className="absolute left-0 top-0 flex h-full w-sidebar max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar shadow-overlay"
      >
        <div className="flex h-header shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-2.5">
            <AppMark size="sm" inverted />

            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight tracking-tight text-sidebar-strong">ITAM</p>
              <p className="text-2xs leading-tight text-sidebar-muted">Asset Management</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-strong"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <NavList onNavigate={onClose} />
      </div>
    </div>
  );
}

// ============================================================
// ROUTE GUARDS
// ============================================================

/** Old Computer Builds links now land on the merged Assign Assets page. */
function SystemsRedirect() {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set("view", "computers");

  return <Navigate to={`/asset-manager?${next.toString()}`} replace />;
}

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
    <ConfirmProvider>
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
            <Route path="/systems" element={<SystemsRedirect />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/employees" element={<EmployeeList />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users-roles" element={<UsersRoles />} />
            <Route path="/software" element={<SoftwareList />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster />
    </ConfirmProvider>
  );
}
