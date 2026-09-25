import { Link } from "react-router-dom";
import { useDroppable } from "@dnd-kit/core";
import { clsx } from "clsx";
import {
  Laptop,
  AppWindow,
  Package,
  Monitor,
  Undo2,
  ChevronRight,
} from "lucide-react";

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
  onAssignSystemClick,
  onReleaseClick,
  onUnassignClick,
  releasingAssets,
  returningAsset,
}: {
  employee: Employee;
  activeAssetId: string | null;
  onOpenDetail: (asset: Asset) => void;
  onTransferClick: (asset: Asset) => void;
  onAssignClick?: (employee: Employee) => void;
  onAssignSystemClick?: (employee: Employee) => void;
  onReleaseClick?: (employee: Employee) => void;
  onUnassignClick?: (asset: Asset) => void;
  releasingAssets?: boolean;
  returningAsset?: boolean;
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `employee-${employee.id}`,
    data: { employee },
  });

  const assignments = employee.assignments ?? [];
  const hardware = assignments.filter((a) => a.asset?.kind === "HARDWARE");
  const software = assignments.filter((a) => a.asset?.kind === "SOFTWARE");
  const systems = employee.systems ?? [];

  const draggingAsset = active?.data.current?.asset as Asset | undefined;
  const isValidDrop = draggingAsset
    ? draggingAsset.assignments?.[0]?.employeeId !== employee.id
    : false;
  const isInvalidHover = isOver && draggingAsset && !isValidDrop;

  const hasExited = employee.status === "EXITED";
  const hasActiveAssets = assignments.some((a) => a.status === "ACTIVE");
  const hasSystem = systems.length > 0;
  const isEmpty =
    systems.length === 0 && hardware.length === 0 && software.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        "flex flex-col rounded-xl border bg-card transition-all",
        isOver && isValidDrop && "border-brand-400 ring-2 ring-brand-100",
        isInvalidHover &&
          "border-destructive-border ring-2 ring-destructive-border",
        !isOver && "border-border",
      )}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
          {initials(employee.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-foreground">
              {employee.name}
            </p>
            {hasExited && (
              <span className="shrink-0 rounded-full bg-destructive-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive-strong">
                Exited
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {assignments.length} asset{assignments.length !== 1 ? "s" : ""}
            {hasSystem
              ? ` · ${systems.length} system${systems.length !== 1 ? "s" : ""}`
              : ""}
          </p>
        </div>

        {!hasExited && (onAssignClick || onAssignSystemClick) && (
          <div className="flex shrink-0 gap-1">
            {onAssignClick && (
              <button
                type="button"
                onClick={() => onAssignClick(employee)}
                title="Assign asset from pool"
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Package className="h-3.5 w-3.5" />
              </button>
            )}
            {onAssignSystemClick && (
              <button
                type="button"
                onClick={() => onAssignSystemClick(employee)}
                title={
                  hasSystem
                    ? "Transfer this employee’s system"
                    : "Assign an unassigned system"
                }
                className={clsx(
                  "rounded-md p-1.5 hover:bg-muted",
                  hasSystem
                    ? "text-amber-600 hover:text-amber-700 dark:text-amber-400"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        {isEmpty ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            Nothing assigned yet
          </p>
        ) : (
          <>
            {/* Systems — compact rows */}
            {systems.length > 0 && (
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Monitor className="h-3 w-3" />
                  Systems
                </p>
                <div className="space-y-1">
                  {systems.map((system) => (
                    <Link
                      key={system.id}
                      to={`/systems?system=${system.id}`}
                      className="group flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-sm transition hover:border-brand-300 hover:bg-brand-50/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                          {system.name}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {system.systemTag}
                          {system.assignments?.length
                            ? ` · ${system.assignments.length} components`
                            : ""}
                        </p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Hardware */}
            {hardware.length > 0 && (
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Laptop className="h-3 w-3" />
                  Hardware · {hardware.length}
                </p>
                <div className="space-y-1">
                  {hardware.map(
                    (a) =>
                      a.asset && (
                        <AssetChip
                          key={a.id}
                          asset={a.asset}
                          onOpenDetail={onOpenDetail}
                          transferrable={a.asset.status === "ASSIGNED"}
                          onUnassign={onUnassignClick}
                          returning={returningAsset}
                        />
                      ),
                  )}
                </div>
              </div>
            )}

            {/* Software */}
            {software.length > 0 && (
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <AppWindow className="h-3 w-3" />
                  Software · {software.length}
                </p>
                <div className="space-y-1">
                  {software.map(
                    (a) =>
                      a.asset && (
                        <AssetChip
                          key={a.id}
                          asset={a.asset}
                          onOpenDetail={onOpenDetail}
                          transferrable={false}
                          onUnassign={onUnassignClick}
                          returning={returningAsset}
                        />
                      ),
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer (exited only, or minimal stats) ─────────── */}
      {hasExited && onReleaseClick ? (
        <div className="border-t border-border px-4 py-2.5">
          <button
            type="button"
            disabled={!hasActiveAssets || releasingAssets}
            onClick={() => onReleaseClick(employee)}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-destructive-border px-2 py-1.5 text-[11px] font-medium text-destructive-strong hover:bg-destructive-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Undo2 className="h-3.5 w-3.5" />
            {releasingAssets ? "Releasing…" : "Release all assets"}
          </button>
        </div>
      ) : !isEmpty ? (
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[10px] text-muted-foreground">
          <span>
            {hardware.length}HW
            {software.length > 0 ? ` · ${software.length}SW` : ""}
          </span>
          {hasSystem && (
            <span className="font-medium text-brand-600">
              {systems.length} system{systems.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
