import { clsx } from 'clsx';
import {
  LayoutGrid, Boxes, Archive, Users, Settings, ChevronsLeft, ChevronsRight, Laptop2,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/asset-manager', label: 'Asset Manager', icon: Boxes },
  { to: '/inventory', label: 'Inventory', icon: Archive },
  { to: '/users-roles', label: 'Users & Roles', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className={clsx(
        'hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-all duration-200 md:flex',
        collapsed ? 'w-[68px]' : 'w-60',
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-slate-100 px-4">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Laptop2 className="h-4 w-4" />
        </div>
        {!collapsed && <span className="text-sm font-semibold tracking-tight text-slate-900">ITAM</span>}
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="flex items-center gap-2 border-t border-slate-100 px-4 py-3 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /> Collapse</>}
      </button>
    </aside>
  );
}
