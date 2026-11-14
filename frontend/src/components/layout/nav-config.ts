import {
  Archive,
  Network,
  Building2,
  Wrench,
  Tags,
  Boxes,
  BarChart3,
  ComputerIcon,
  LayoutGrid,
  UserSquare2,
  Users,
  ShieldCheck,
  History,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

// ============================================================
// NAVIGATION CONFIG
// Single source of truth for the sidebar (desktop + mobile) and
// the header breadcrumb. Routes are unchanged; only labels and
// grouping are plain-English so first-time users can find things.
// ============================================================

export interface NavItem {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        to: '/',
        label: 'Dashboard',
        description: 'What needs attention today',
        icon: LayoutGrid,
        end: true,
      },
      {
        to: '/reports',
        label: 'Reports',
        description: 'Export asset and usage reports',
        icon: BarChart3,
      },
    ],
  },
  {
    label: 'Assets',
    items: [
      {
        to: '/inventory',
        label: 'Inventory',
        description: 'Every hardware and software asset',
        icon: Archive,
      },
      {
        to: '/repair-maintenance',
        label: 'Repair & Maintenance',
        description: 'Track repairs and maintain equipment',
        icon: Wrench,
      },
      {
        to: '/asset-manager',
        label: 'Asset Manager',
        description: 'People, computers and the equipment they hold',
        icon: Boxes,
      },
      {
        to: '/asset-categories',
        label: 'Categories',
        description: 'Manage hardware and software categories',
        icon: Tags,
      },
      {
        to: '/software',
        label: 'Software & Licenses',
        description: 'Installed software and license seats',
        icon: ComputerIcon,
      },
    ],
  },
  {
    label: 'Network',
    items: [
      {
        to: '/network/racks',
        label: 'Racks',
        description: 'Manage racks and their equipment',
        icon: Boxes,
      },
      {
        to: '/network/areas',
        label: 'Areas',
        description: 'Manage physical network areas',
        icon: Building2,
      },
      {
        to: '/network',
        label: 'Network Map',
        description: 'Office racks and network connections',
        icon: Network,
        end: true,
      },
    ],
  },
  {
    label: 'People',
    items: [
      // {
      //   to: '/communication',
      //   label: 'Communication',
      //   description: 'Zoho accounts, channels and employee onboarding',
      //   icon: MessageSquare,
      // },
      {
        to: '/employees',
        label: 'Team',
        description: 'People who can receive assets',
        icon: UserSquare2,
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        to: '/users',
        label: 'Users',
        description: 'Who can sign in and what they can do',
        icon: Users,
      },
      {
        to: '/roles-permissions',
        label: 'Roles & Permissions',
        description: 'Manage roles and access permissions',
        icon: ShieldCheck,
      },
      {
        to: '/activity-logs',
        label: 'Activity Logs',
        description: 'Review business changes and account activity',
        icon: History,
      },
    ],
  },
];

/** Flat list, in display order. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Breadcrumb labels for every first-level route segment. */
export const ROUTE_LABELS: Record<string, string> = {
  '': 'Dashboard',
  ...Object.fromEntries(NAV_ITEMS.map((item) => [item.to.replace(/^\//, ''), item.label])),
  settings: 'Settings',
  connectors: 'Connectors',
  racks: 'Racks',
  areas: 'Areas',
};
