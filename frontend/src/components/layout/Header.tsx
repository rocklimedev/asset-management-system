import { Bell, Menu, Search, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CommandPalette } from './CommandPalette';

const LABELS: Record<string, string> = {
  '': 'Dashboard',
  'asset-manager': 'Asset Manager',
  inventory: 'Inventory',
  'users-roles': 'Users & Roles',
  settings: 'Settings',
};

export function Header({ onMobileMenu }: { onMobileMenu: () => void }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

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

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <button onClick={onMobileMenu} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden">
          <Menu className="h-5 w-5" />
        </button>

        <nav className="hidden items-center gap-1.5 text-sm text-slate-500 sm:flex" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-slate-800">ITAM</Link>
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
              <span className="text-slate-800">{LABELS[seg] ?? seg}</span>
            </span>
          ))}
          {segments.length === 0 && <span className="text-slate-800">{LABELS['']}</span>}
        </nav>

        <button
          onClick={() => setPaletteOpen(true)}
          className="ml-auto flex w-full max-w-sm items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-300 sm:ml-4"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search employees, assets, IDs...</span>
          <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">Ctrl K</kbd>
        </button>

        <button className="relative ml-2 rounded-md p-2 text-slate-500 hover:bg-slate-100">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </button>

        <button className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
          AM
        </button>
      </header>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
