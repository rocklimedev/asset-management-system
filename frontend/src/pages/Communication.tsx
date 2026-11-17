import { NavLink, Link, Outlet } from 'react-router-dom';
import {
  Bot,
  ClipboardList,
  Hash,
  LayoutGrid,
  Layers,
  Plug,
  Settings,
  UserPlus,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SECTIONS = [
  { to: '/communication', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/communication/new-hire', label: 'New hire', icon: UserPlus, end: false },
  { to: '/communication/onboarding', label: 'Onboarding', icon: ClipboardList, end: false },
  { to: '/communication/channels', label: 'Channels', icon: Hash, end: false },
  { to: '/communication/bots', label: 'Bots', icon: Bot, end: false },
  { to: '/communication/profiles', label: 'Profiles', icon: Layers, end: false },
  { to: '/communication/setup', label: 'Setup', icon: Settings, end: false },
] as const;

/** Shared shell for every Communication page: header, section pills, then the routed page. */
export default function Communication() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        title="Communication"
        description="Zoho Mail, Cliq channels, bots and employee onboarding in one place."
        actions={
          <Link to="/settings/connectors" className={buttonVariants({ variant: 'outline' })}>
            <Plug aria-hidden="true" />
            Zoho connectors
          </Link>
        }
      />
      <nav aria-label="Communication sections" className="-mx-1 overflow-x-auto pb-1">
        <ul className="flex w-max gap-2 px-1">
          {SECTIONS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )
                }
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
