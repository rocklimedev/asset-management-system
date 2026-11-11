import { ChevronDown, ChevronRight, LogOut, Menu, Moon, Search, Settings, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import { CommandPalette } from './CommandPalette';
import { ROUTE_LABELS } from './nav-config';
import { useAuth } from '../../services/context/AuthContext';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';

const IS_MAC =
  typeof navigator !== 'undefined' &&
  /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

function getInitials(name?: string, email?: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  if (email) return email.slice(0, 2).toUpperCase();

  return '?';
}

/**
 * Top bar: breadcrumb on the left, a single centred search that opens the
 * command palette (⌘K), and the account menu on the right. One search, one
 * place to find things, the same on every page.
 */
export function Header({ onMobileMenu }: { onMobileMenu: () => void }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  const toggleTheme = () => {
    const nextDarkMode = !darkMode;
    document.documentElement.classList.toggle('dark', nextDarkMode);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', nextDarkMode ? '#0F1729' : '#f8fafc');
    setDarkMode(nextDarkMode);
    try {
      localStorage.setItem('itam-theme', nextDarkMode ? 'dark' : 'light');
    } catch {
      // Keep the toggle usable when browser storage is unavailable.
    }
  };

  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  const { user, logout } = useAuth();
  const initials = getInitials(user?.name, user?.email);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handler);

    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <header className="flex h-header shrink-0 items-center gap-3 border-b border-border bg-background px-4">
        {/* MOBILE MENU */}

        <button
          type="button"
          onClick={onMobileMenu}
          aria-label="Open navigation"
          className={cn(
            'inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground md:hidden',
            'transition-colors hover:bg-muted hover:text-foreground',
            'outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* BREADCRUMB */}

        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm lg:flex">
          <Link
            to="/"
            className="rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            ITAM
          </Link>

          {(segments.length === 0 ? [''] : segments).map((segment, index) => (
            <span key={index} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />

              <span className="truncate font-medium text-foreground">
                {ROUTE_LABELS[segment] ?? segment}
              </span>
            </span>
          ))}
        </nav>

        {/* SEARCH — centred, opens the command palette */}

        <div className="flex min-w-0 flex-1 justify-center">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search (press Control or Command K)"
            className={cn(
              'flex h-9 w-full max-w-md items-center gap-2 rounded-full border border-border bg-card px-3.5',
              'text-sm text-muted-foreground transition-colors hover:border-primary-border hover:text-foreground',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />

            <span className="flex-1 truncate text-left">Search pages and actions</span>

            <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground sm:inline">
              {IS_MAC ? '⌘K' : 'Ctrl K'}
            </kbd>
          </button>
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {darkMode ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
        </button>

        {/* ACCOUNT */}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-full py-1 pl-1 pr-2 outline-none transition-colors hover:bg-muted',
                'focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <span className="hidden min-w-0 text-left md:block">
                <span className="block max-w-[10rem] truncate text-sm font-medium leading-tight text-foreground">
                  {user?.name || 'Signed in'}
                </span>

                {user?.role && (
                  <span className="block truncate text-xs leading-tight text-muted-foreground">
                    {user.role}
                  </span>
                )}
              </span>

              <ChevronDown className="hidden h-4 w-4 text-muted-foreground md:block" aria-hidden="true" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className={cn(
                'z-50 w-60 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-overlay',
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              )}
            >
              <div className="px-2 py-2">
                <p className="truncate text-sm font-semibold text-foreground">
                  {user?.name || 'Signed in'}
                </p>

                {user?.email && (
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                )}
              </div>

              <Separator className="my-1" />

              <DropdownMenu.Item
                asChild
                className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-2 text-sm text-foreground outline-none focus:bg-muted"
              >
                <Link to="/settings">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </Link>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                onSelect={() => logout()}
                className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-2 text-sm text-muted-foreground outline-none focus:bg-destructive-muted focus:text-destructive-strong"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
