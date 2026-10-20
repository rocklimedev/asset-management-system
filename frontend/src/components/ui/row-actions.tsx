import { MoreHorizontal, type LucideIcon } from "lucide-react";

import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";

// ============================================================
// ROW ACTIONS
//
// One visible primary action (with a text label) plus an
// overflow menu for everything else, so rows stay scannable and
// every action is discoverable by name — never icon-only guesses.
// ============================================================

export interface RowActionItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /** Draws a divider above this item (use before destructive items). */
  separatorBefore?: boolean;
}

interface RowActionsProps {
  /** Name of the record, used to label the menu for screen readers. */
  recordName: string;
  primary?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    disabled?: boolean;
  };
  items: RowActionItem[];
}

export function RowActions({ recordName, primary, items }: RowActionsProps) {
  const PrimaryIcon = primary?.icon;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {primary && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={primary.onClick}
          disabled={primary.disabled}
        >
          {PrimaryIcon && <PrimaryIcon aria-hidden="true" />}
          {primary.label}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`More actions for ${recordName}`}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-48">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label}>
                {item.separatorBefore && <DropdownMenuSeparator />}

                <DropdownMenuItem
                  variant={item.destructive ? "destructive" : "default"}
                  disabled={item.disabled}
                  onSelect={item.onSelect}
                  className="py-2"
                >
                  {Icon && <Icon aria-hidden="true" />}
                  {item.label}
                </DropdownMenuItem>
              </div>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
