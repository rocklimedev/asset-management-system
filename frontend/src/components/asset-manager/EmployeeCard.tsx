import { useDroppable } from "@dnd-kit/core";
import { clsx } from "clsx";
import { Laptop, AppWindow, MapPin, Package, Undo2 } from "lucide-react";

import type { Asset } from "../../services/api/asset.api";
import type { Employee } from "../../services/api/employees.api";
import { AssetChip } from "./AssetChip";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function EmployeeCard({
  employee,
  activeAssetId,
  onOpenDetail,
  onTransferClick,
  onAssignClick,
  onReleaseClick,
  releasingAssets,
}: {
  employee: Employee;
  // UUID string, matching the backend's CHAR(36) asset ids — was
  // incorrectly typed/passed as `number` before, which meant
  // Number(uuid) always resolved to NaN.
  activeAssetId: string | null;
  onOpenDetail: (asset: Asset) => void;
  onTransferClick: (asset: Asset) => void;
  // Open the asset pool to assign a new asset to this employee.
  onAssignClick?: (employee: Employee) => void;
  // Bulk-return every asset this employee currently holds — shown only
  // for employees who have exited.
  onReleaseClick?: (employee: Employee) => void;
  releasingAssets?: boolean;
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `employee-${employee.id}`,
    data: { employee },
  });

  const assignments = employee.assignments ?? [];
  const hardware = assignments.filter((a) => a.asset?.kind === "HARDWARE");
  const software = assignments.filter((a) => a.asset?.kind === "SOFTWARE");

  const draggingAsset = active?.data.current?.asset as Asset | undefined;
  const isValidDrop = draggingAsset
    ? draggingAsset.assignments?.[0]?.employeeId !== employee.id
    : false;
  const isInvalidHover = isOver && draggingAsset && !isValidDrop;

  const hasExited = employee.status === "EXITED";
  const hasActiveAssets = assignments.some((a) => a.status === "ACTIVE");

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex flex-col rounded-xl border bg-card p-4 transition-all",
        isOver && isValidDrop && "border-brand-400 ring-2 ring-brand-100",
        isInvalidHover &&
          "border-destructive-border ring-2 ring-destructive-border",
        !isOver && "border-border",
      )}
    >
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
          {initials(employee.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-foreground">
              {employee.name}
            </p>
            {hasExited && (
              <span className="shrink-0 rounded-full bg-destructive-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive-strong">
                Exited
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"></div>
        </div>

        {onAssignClick && !hasExited && (
          <button
            type="button"
            onClick={() => onAssignClick(employee)}
            title="Assign asset from pool"
            className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted"
          >
            <Package className="h-3.5 w-3.5" />
            Assign
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Laptop className="h-3 w-3" /> Hardware ({hardware.length})
          </div>
          {hardware.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground">
              No hardware assigned.
            </p>
          ) : (
            <div className="space-y-1.5">
              {hardware.map(
                (a) =>
                  a.asset && (
                    <AssetChip
                      key={a.id}
                      asset={a.asset}
                      onOpenDetail={onOpenDetail}
                      transferrable={a.asset.status === "ASSIGNED"}
                    />
                  ),
              )}
            </div>
          )}
        </div>

        {software.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <AppWindow className="h-3 w-3" /> Software ({software.length})
            </div>
            <div className="space-y-1.5">
              {software.map(
                (a) =>
                  a.asset && (
                    <AssetChip
                      key={a.id}
                      asset={a.asset}
                      onOpenDetail={onOpenDetail}
                      transferrable={false}
                    />
                  ),
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <span className="text-xs text-muted-foreground">
          {assignments.length} asset{assignments.length !== 1 ? "s" : ""} total
        </span>

        {hasExited && onReleaseClick ? (
          <button
            type="button"
            disabled={!hasActiveAssets || releasingAssets}
            onClick={() => onReleaseClick(employee)}
            className="flex items-center gap-1 rounded-md border border-destructive-border px-2 py-1 text-[11px] font-medium text-destructive-strong hover:bg-destructive-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Undo2 className="h-3.5 w-3.5" />
            {releasingAssets ? "Releasing…" : "Release assets"}
          </button>
        ) : (
          <span className="text-xs font-medium text-brand-600">
            {hardware.length}HW · {software.length}SW
          </span>
        )}
      </div>
    </div>
  );
}
