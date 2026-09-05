
import { Bell, ChevronRight, LogOut, Menu, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';
import { useAuth } from '../../services/context/AuthContext';

const LABELS: Record<string, string> = {
  '': 'Dashboard',
  'asset-manager': 'Asset Manager',
  inventory: 'Inventory',
  'users-roles': 'Users & Roles',
  settings: 'Settings',
};

function getInitials(name?: string, email?: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return '?';
}

export function Header({ onMobileMenu }: { onMobileMenu: () => void }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  const { user, logout } = useAuth();
  const initials = getInitials(user?.name, user?.email);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handler);

    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close account menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [menuOpen]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        {/* Mobile menu */}
        <button
          onClick={onMobileMenu}
          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumb */}
        <nav
          className="hidden items-center gap-1.5 text-sm text-slate-500 sm:flex"
          aria-label="Breadcrumb"
        >
          <Link
            to="/"
            className="hover:text-slate-800"
          >
            ITAM
          </Link>

          {segments.map((seg, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5"
            >
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />

              <span className="text-slate-800">
                {LABELS[seg] ?? seg}
              </span>
            </span>
          ))}

          {segments.length === 0 && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />

              <span className="text-slate-800">
                {LABELS['']}
              </span>
            </>
          )}
        </nav>

        {/* Push account menu to the far right */}
        <div
          className="relative ml-auto"
          ref={menuRef}
        >
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white transition hover:bg-brand-700"
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            {initials}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-40 w-56 rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg">
              {/* User information */}
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-800">
                  {user?.name || 'Signed in'}
                </p>

                {user?.email && (
                  <p className="truncate text-xs text-slate-500">
                    {user.email}
                  </p>
                )}
              </div>

              {/* Logout */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}

