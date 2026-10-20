import { useDraggable } from "@dnd-kit/core";
import { clsx } from "clsx";
import {
  AppWindow,
  ArrowRightLeft,
  GripVertical,
  Headphones,
  Keyboard,
  Laptop,
  Monitor,
  Mouse,
  Printer,
  Server,
  Smartphone,
  Tablet,
  Undo2,
} from "lucide-react";

import { Button } from "../ui/button";
import type { Asset } from "../../services/api/asset.api";

// ============================================================
// ICONS
// ============================================================

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Laptop,
  Monitor,
  Keyboard,
  Mouse,
  Headset: Headphones,
  Mobile: Smartphone,
  Tablet,
  Printer,
  Server,
};

function iconFor(asset: Asset) {
  if (asset.kind === "SOFTWARE") return AppWindow;
  return ICONS[asset.category?.name ?? ""] ?? Laptop;
}

// ============================================================
// ASSIGNMENT ROW
// One asset held by a person. Actions are written out in words
// ("Move", "Return") so nobody has to guess what an icon does.
// Hardware can be dragged onto another person to move it.
// ============================================================

export function AssignmentRow({
  asset,
  draggable,
  onOpenDetails,
  onMove,
  onReturn,
  returning,
}: {
  asset: Asset;
  draggable: boolean;
  onOpenDetails: (asset: Asset) => void;
  onMove?: (asset: Asset) => void;
  onReturn?: (asset: Asset) => void;
  returning?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `asset-${asset.id}`,
    data: { asset },
    disabled: !draggable,
  });

  const Icon = iconFor(asset);
  const canReturn = asset.status === "ASSIGNED" && Boolean(onReturn);

  return (
    <li
      ref={setNodeRef}
      className={clsx(
        "flex items-center gap-3 py-3",
        isDragging && "opacity-40",
      )}
    >
      {draggable && (
        <button
          type="button"
          aria-label={`Drag ${asset.name} onto another person to move it`}
          title="Drag onto someone in the list to move it"
          className="hidden h-7 w-5 shrink-0 cursor-grab touch-none items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing sm:flex"
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>

      <button
        type="button"
        onClick={() => onOpenDetails(asset)}
        className="min-w-0 flex-1 rounded-md text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="block truncate text-sm font-medium text-foreground">
          {asset.name}
        </span>
        <span className="block truncate text-xs tabular-nums text-muted-foreground">
          {asset.assetTag || "No asset tag"}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1">
        {draggable && onMove && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMove(asset)}
            className="shadow-none"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Move
          </Button>
        )}

        {canReturn && (
          <Button
            variant="ghost"
            size="sm"
            disabled={returning}
            onClick={() => onReturn?.(asset)}
            className="text-muted-foreground"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Return
          </Button>
        )}
      </div>
    </li>
  );
}
