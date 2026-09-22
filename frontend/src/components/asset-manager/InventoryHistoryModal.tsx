import { ArrowDownCircle, ArrowUpCircle, Boxes } from "lucide-react";

import {
  useGetInventoryHistoryQuery,
  type Asset,
} from "../../services/api/asset.api";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

// ============================================================
// TYPES
// ============================================================

interface InventoryHistoryModalProps {
  open: boolean;
  asset: Asset | null;
  onClose: () => void;
}

// ============================================================
// HELPERS
// ============================================================

function formatChangeType(changeType: string) {
  return changeType
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// ============================================================
// COMPONENT
// ============================================================

export function InventoryHistoryModal({
  open,
  asset,
  onClose,
}: InventoryHistoryModalProps) {
  const {
    data: entries = [],
    isLoading,
    isError,
    refetch,
  } = useGetInventoryHistoryQuery(asset?.id ?? "", {
    skip: !open || !asset,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Inventory history</DialogTitle>
          <DialogDescription>
            {asset
              ? `Every stock change recorded for ${asset.name}.`
              : "Every stock change recorded for this asset."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading history…
            </p>
          ) : isError ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Could not load inventory history.{" "}
              <Button variant="outline" size="sm" onClick={refetch}>
                Retry
              </Button>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <Boxes className="h-8 w-8" />
              No inventory changes recorded yet.
            </div>
          ) : (
            entries.map((entry) => {
              const isIncrease = entry.quantityDelta >= 0;

              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  {isIncrease ? (
                    <ArrowUpCircle className="mt-0.5 h-5 w-5 shrink-0 text-success-strong" />
                  ) : (
                    <ArrowDownCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive-strong" />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {formatChangeType(entry.changeType)}
                      </Badge>
                      <span
                        className={
                          "text-sm font-medium tabular-nums " +
                          (isIncrease
                            ? "text-success-strong"
                            : "text-destructive-strong")
                        }
                      >
                        {isIncrease ? "+" : ""}
                        {entry.quantityDelta}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Quantity after: {entry.quantityAfter} · Assigned after:{" "}
                      {entry.quantityAssignedAfter}
                    </p>

                    {entry.reason && (
                      <p className="mt-1 text-sm">{entry.reason}</p>
                    )}

                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(entry.createdAt)} · {entry.performedBy}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InventoryHistoryModal;
