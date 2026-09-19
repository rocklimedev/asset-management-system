import { ChevronRight, LogOut, Menu, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

import { CommandPalette } from "./CommandPalette";
import { useAuth } from "../../services/context/AuthContext";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  "": "Dashboard",
  "asset-manager": "Asset Manager",
  inventory: "Inventory",
  employees: "Employees",
  reports: "Reports",
  "users-roles": "Users & Roles",
  settings: "Settings",
};

function getInitials(name?: string, email?: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
  }

  if (email) return email.slice(0, 2).toUpperCase();

  return "?";
}

export function Header({ onMobileMenu }: { onMobileMenu: () => void }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const { user, logout } = useAuth();
  const initials = getInitials(user?.name, user?.email);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="flex h-header shrink-0 items-center gap-3 border-b border-border bg-card px-4">
        {/* ==================================================
            MOBILE MENU
        ================================================== */}

        <button
          type="button"
          onClick={onMobileMenu}
          aria-label="Open navigation"
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground md:hidden",
            "transition-colors hover:bg-muted hover:text-foreground",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          )}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* ==================================================
            BREADCRUMB
        ================================================== */}

        <nav
          aria-label="Breadcrumb"
          className="hidden items-center gap-1.5 text-sm sm:flex"
        >
          <Link
            to="/"
            className="rounded text-muted-foreground transition-colors hover:text-foreground"
          >
            ITAM
          </Link>

          {(segments.length === 0 ? [""] : segments).map((segment, index) => (
            <span key={index} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />

              <span className="font-medium text-foreground">
                {LABELS[segment] ?? segment}
              </span>
            </span>
          ))}
        </nav>

        {/* ==================================================
            SEARCH
        ================================================== */}

        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className={cn(
            "ml-auto flex h-8 items-center gap-2 rounded-md border border-input bg-background px-2.5",
            "text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
          )}
        >
          <Search className="h-4 w-4" />

          <span className="hidden sm:inline">Search</span>

          <kbd className="ml-2 hidden rounded border border-border bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground sm:inline">
            ⌘K
          </kbd>
        </button>

        {/* ==================================================
            ACCOUNT
        ================================================== */}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              aria-label="Account menu"
              className={cn(
                "rounded-full outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className={cn(
                "z-50 w-60 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-overlay",
                "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
                "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              )}
            >
              <div className="px-2 py-2">
                <p className="truncate text-sm font-semibold text-foreground">
                  {user?.name || "Signed in"}
                </p>

                {user?.email && (
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                )}
              </div>

              <Separator className="my-1" />

              <DropdownMenu.Item
                onSelect={() => logout()}
                className={cn(
                  "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none",
                  "text-muted-foreground focus:bg-destructive-muted focus:text-destructive-strong",
                )}
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
