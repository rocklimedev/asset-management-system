import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Laptop,
  Monitor,
  Keyboard,
  Mouse,
  Headphones,
  Smartphone,
  Tablet,
  Printer,
  Server,
  AppWindow,
  GripVertical,
  Undo2,
} from "lucide-react";
import { clsx } from "clsx";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import type { Asset } from "../../services/api/asset.api";

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

export function AssetChip({
  asset,
  onOpenDetail,
  transferrable,
  onUnassign,
  returning,
}: {
  asset: Asset;
  onOpenDetail: (asset: Asset) => void;
  transferrable: boolean;
  onUnassign?: (asset: Asset) => void;
  returning?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `asset-${asset.id}`,
    data: { asset },
    disabled: !transferrable,
  });

  const Icon = iconFor(asset);
  const canUnassign = asset.status === "ASSIGNED" && Boolean(onUnassign);

  return (
    <Card
      ref={setNodeRef}
      className={clsx(
        "group flex flex-row items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-2",
        "transition-shadow hover:shadow-sm",
        isDragging && "opacity-40",
      )}
    >
      {/* Native handle — do not use shadcn Button here */}
      <button
        type="button"
        {...(transferrable ? { ...listeners, ...attributes } : {})}
        aria-label={
          transferrable
            ? `Drag ${asset.name} to transfer`
            : `${asset.name} cannot be transferred`
        }
        disabled={!transferrable}
        className={clsx(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground",
          transferrable
            ? "cursor-grab touch-none hover:bg-muted hover:text-foreground active:cursor-grabbing"
            : "cursor-not-allowed opacity-50",
        )}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      <button
        type="button"
        onClick={() => onOpenDetail(asset)}
        className="h-auto min-w-0 flex-1 justify-start px-1.5 py-1 text-left"
      >
        <div className="min-w-0 w-full">
          <p className="truncate text-xs font-medium text-foreground">
            {asset.name}
          </p>
          <p className="truncate text-[11px] text-muted-foreground tabular-nums">
            {asset.assetTag}
          </p>
        </div>
      </button>

      {canUnassign && (
        <button
          type="button"
          title="Unassign / return to pool"
          disabled={returning}
          onClick={(e) => {
            e.stopPropagation();
            onUnassign?.(asset);
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
      )}
    </Card>
  );
}
