import { NavLink } from "react-router-dom";
import {
  Archive,
  BarChart3,
  Boxes,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  Settings,
  Users,
  UserSquare2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AppMark } from "./AppMark";

export const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutGrid, end: true },
  { to: "/asset-manager", label: "Asset Manager", icon: Boxes },
  { to: "/inventory", label: "Inventory", icon: Archive },
  { to: "/employees", label: "Employees", icon: UserSquare2 },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/users-roles", label: "Users & Roles", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar",
      )}
    >
      {/* ======================================================
          BRAND
      ====================================================== */}

      <div
        className={cn(
          "flex h-header shrink-0 items-center gap-2.5 border-b border-sidebar-border",
          collapsed ? "justify-center px-0" : "px-4",
        )}
      >
        <AppMark />

        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight tracking-tight text-foreground">
              ITAM
            </p>
            <p className="truncate text-2xs leading-tight text-muted-foreground">
              Asset Management
            </p>
          </div>
        )}
      </div>

      {/* ======================================================
          NAVIGATION
      ====================================================== */}

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center rounded-md text-sm font-medium transition-colors duration-150",
                "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-2.5 py-2",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary"
                  />
                )}

                <item.icon className="h-4.5 w-4.5 shrink-0" />

                {!collapsed && <span className="truncate">{item.label}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ======================================================
          COLLAPSE
      ====================================================== */}

      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={cn(
          "flex h-11 shrink-0 items-center gap-2 border-t border-sidebar-border text-xs font-medium",
          "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring",
          collapsed ? "justify-center px-0" : "px-4",
        )}
      >
        {collapsed ? (
          <ChevronsRight className="h-4 w-4" />
        ) : (
          <>
            <ChevronsLeft className="h-4 w-4" />
            Collapse
          </>
        )}
      </button>
    </aside>
  );
}
