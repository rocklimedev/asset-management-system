import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { NavList, Sidebar } from './Sidebar';
import { Header } from './Header';
import { ROUTE_LABELS } from './nav-config';
import { AppMark } from './AppMark';

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
    const segment = pathname.split('/').filter(Boolean)[0] ?? '';
    const label = ROUTE_LABELS[segment];

    document.title = label ? `${label} · ITAM` : 'ITAM — Asset Management';
  }, [pathname]);
}

export default function ApplicationLayout() {
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

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((current) => !current)} />

      {/* ======================================================
          MOBILE SIDEBAR
      ====================================================== */}

      {mobileOpen && <MobileNavDrawer onClose={() => setMobileOpen(false)} />}

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onMobileMenu={() => setMobileOpen(true)} />

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
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
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
              <p className="text-sm font-semibold leading-tight tracking-tight text-sidebar-strong">
                ITAM
              </p>
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

