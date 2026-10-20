import {
  Archive,
  Boxes,
  BarChart3,
  ComputerIcon,
  LayoutGrid,
  UserSquare2,
  Users,
  type LucideIcon,
} from "lucide-react";

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
    label: "Overview",
    items: [
      {
        to: "/",
        label: "Dashboard",
        description: "What needs attention today",
        icon: LayoutGrid,
        end: true,
      },
      {
        to: "/reports",
        label: "Reports",
        description: "Export asset and usage reports",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Assets",
    items: [
      {
        to: "/inventory",
        label: "All Assets",
        description: "Every hardware and software asset",
        icon: Archive,
      },
      {
        to: "/asset-manager",
        label: "Assign Assets",
        description: "People, computers and the equipment they hold",
        icon: Boxes,
      },
      {
        to: "/software",
        label: "Software & Licenses",
        description: "Installed software and license seats",
        icon: ComputerIcon,
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        to: "/employees",
        label: "Employees",
        description: "People who can receive assets",
        icon: UserSquare2,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        to: "/users-roles",
        label: "Users & Roles",
        description: "Who can sign in and what they can do",
        icon: Users,
      },
    ],
  },
];

/** Flat list, in display order. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Breadcrumb labels for every first-level route segment. */
export const ROUTE_LABELS: Record<string, string> = {
  "": "Dashboard",
  ...Object.fromEntries(
    NAV_ITEMS.map((item) => [item.to.replace(/^\//, ""), item.label]),
  ),
  settings: "Settings",
};
