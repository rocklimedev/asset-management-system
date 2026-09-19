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
}: {
  asset: Asset;
  onOpenDetail: (asset: Asset) => void;
  transferrable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `asset-${asset.id}`,
      data: { asset },
      disabled: !transferrable,
    });

  const Icon = iconFor(asset);

  return (
    <Card
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
      }}
      className={clsx(
        "group flex flex-row items-center gap-2 rounded-lg border bg-muted/30 px-2.5 py-2",
        "transition-shadow hover:shadow-sm",
        isDragging && "opacity-40",
      )}
    >
      {/* Drag Handle */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        {...(transferrable ? { ...listeners, ...attributes } : {})}
        aria-label={
          transferrable
            ? `Drag ${asset.name} to transfer`
            : `${asset.name} cannot be transferred`
        }
        disabled={!transferrable}
        className={clsx(
          "h-7 w-7 shrink-0 text-muted-foreground",
          transferrable
            ? "cursor-grab touch-none hover:text-foreground active:cursor-grabbing"
            : "cursor-not-allowed opacity-50",
        )}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </Button>

      {/* Asset Icon */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Asset Details */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => onOpenDetail(asset)}
        className="h-auto min-w-0 flex-1 justify-start px-1.5 py-1 text-left hover:bg-transparent"
      >
        <div className="min-w-0 w-full">
          <p className="truncate text-xs font-medium text-foreground">
            {asset.name}
          </p>

          <p className="truncate text-[11px] text-muted-foreground tabular-nums">
            {asset.assetTag}
          </p>
        </div>
      </Button>
    </Card>
  );
}
