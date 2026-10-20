import { NavLink } from "react-router-dom";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { AppMark } from "./AppMark";
import { NAV_GROUPS, type NavItem } from "./nav-config";

export { NAV_GROUPS, NAV_ITEMS } from "./nav-config";

// ============================================================
// NAV LINK
// ============================================================

function SidebarLink({
  item,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      aria-label={collapsed ? item.label : undefined}
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

          <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />

          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate leading-tight">{item.label}</span>
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

// ============================================================
// NAV LIST (shared by desktop sidebar and mobile drawer)
// ============================================================

export function NavList({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto p-2">
      {NAV_GROUPS.map((group, index) => (
        <div key={group.label} className={cn(index > 0 && "mt-3")}>
          {collapsed ? (
            index > 0 && (
              <div aria-hidden="true" className="mx-2 mb-1 border-t border-sidebar-border" />
            )
          ) : (
            <p className="px-2.5 pb-1 pt-1 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
          )}

          <div className="space-y-0.5">
            {group.items.map((item) => (
              <SidebarLink
                key={item.to}
                item={item}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

// ============================================================
// DESKTOP SIDEBAR
// ============================================================

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
      {/* BRAND */}
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

      {/* NAVIGATION */}
      <NavList collapsed={collapsed} />

      {/* COLLAPSE */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        className={cn(
          "flex h-11 shrink-0 items-center gap-2 border-t border-sidebar-border text-xs font-medium",
          "text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          "outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring",
          collapsed ? "justify-center px-0" : "px-4",
        )}
      >
        {collapsed ? (
          <ChevronsRight className="h-4 w-4" aria-hidden="true" />
        ) : (
          <>
            <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
            Collapse menu
          </>
        )}
      </button>
    </aside>
  );
}
