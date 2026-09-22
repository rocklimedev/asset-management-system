import { X, Clock, ArrowRightLeft, Undo2 } from "lucide-react";

import { useGetAssetHistoryQuery } from "../../services/api/asset.api";
import { Badge } from "../ui/badge";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import type { Asset, AssetHistory } from "../../services/api/asset.api";

// ============================================================
// FIELD
// ============================================================

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <p className="mt-0.5 truncate text-sm text-foreground">{value ?? "—"}</p>
    </div>
  );
}

// ============================================================
// COMPONENT
// ============================================================

interface AssetDetailDrawerProps {
  asset: Asset | null;
  onClose: () => void;
  onTransfer: (asset: Asset) => void;
  onEdit: (asset: Asset) => void;
  onUnassign?: (asset: Asset) => void;
}

export function AssetDetailDrawer({
  asset,
  onClose,
  onTransfer,
  onEdit,
  onUnassign,
}: AssetDetailDrawerProps) {
  // ==========================================================
  // ASSET HISTORY
  // ==========================================================

  const {
    data: historyResponse,
    isLoading: historyLoading,
    isFetching: historyFetching,
  } = useGetAssetHistoryQuery(asset?.id != null ? String(asset.id) : "", {
    skip: asset?.id == null,
  });

  /*
   * The API query currently exposes `data` as unknown.
   * Normalize it here so the component has a strongly typed
   * AssetHistory[] instead of propagating unknown through the UI.
   */
  const history: AssetHistory[] = Array.isArray(historyResponse)
    ? (historyResponse as AssetHistory[])
    : [];

  // ==========================================================
  // DON'T RENDER
  // ==========================================================

  if (!asset) return null;

  // ==========================================================
  // CURRENT ASSIGNEE
  // ==========================================================

  const currentSystem = asset.assignments?.[0]?.system;
  const currentAssignee = currentSystem
    ? {
        name: `System: ${currentSystem.systemTag} · ${currentSystem.employee?.name ?? "Unassigned"}`,
      }
    : asset.assignments?.[0]?.employee;

  // ==========================================================
  // CONDITION
  // ==========================================================

  const condition = asset.condition
    ? asset.condition.charAt(0) + asset.condition.slice(1).toLowerCase()
    : "Unknown";

  // ==========================================================
  // STATUS
  // ==========================================================

  const status = asset.status
    ? asset.status.charAt(0) + asset.status.slice(1).toLowerCase()
    : "Unknown";

  const isAssigned = asset.status?.toUpperCase() === "ASSIGNED";

  // ==========================================================
  // DATE HELPERS
  // ==========================================================

  const formatDate = (date?: string) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleDateString();
  };

  const formatDateTime = (date?: string) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleString();
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* BACKDROP */}

      <button
        type="button"
        aria-label="Close asset details"
        className="absolute inset-0 cursor-default bg-black/20"
        onClick={onClose}
      />

      {/* PANEL */}

      <aside className="relative z-10 flex h-full w-full flex-col border-l bg-background shadow-xl sm:max-w-md">
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex items-start justify-between border-b px-6 py-4">
          <div className="min-w-0 pr-4">
            <h2 className="truncate text-base font-semibold text-foreground">
              {asset.name || "Unnamed asset"}
            </h2>

            <p className="text-xs tabular-nums text-muted-foreground">
              {asset.assetTag || "No asset tag"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(asset)}
            >
              Edit
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close asset details"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ==================================================
            CONTENT
        ================================================== */}

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            {/* ==================================================
                STATUS
            ================================================== */}

            <div className="flex items-center gap-2">
              <Badge variant="outline">{status}</Badge>

              <span className="text-xs text-muted-foreground">·</span>

              <span className="text-xs text-muted-foreground">
                {condition} condition
              </span>
            </div>

            <Separator />

            {/* ==================================================
                ASSET INFORMATION
            ================================================== */}

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Asset information
              </h3>

              <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                <Field label="Category" value={asset.category?.name} />

                <Field label="Manufacturer" value={asset.manufacturer} />

                <Field label="Model" value={asset.model} />

                <Field label="Serial number" value={asset.serialNumber} />

                <Field label="Location" value={asset.location?.name} />
              </div>
            </section>

            <Separator />

            {/* ==================================================
                ASSIGNMENT
            ================================================== */}

            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Assignment
              </h3>

              {currentAssignee ? (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {currentSystem ? (
                          <a
                            className="underline underline-offset-4"
                            href={`/systems?system=${currentSystem.id}`}
                          >
                            {currentAssignee.name}
                          </a>
                        ) : (
                          currentAssignee.name
                        )}
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Assigned{" "}
                        {formatDate(asset.assignments?.[0]?.assignedAt)}
                      </p>
                    </div>

                    {!currentSystem && isAssigned && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onTransfer(asset)}
                        >
                          <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                          Transfer
                        </Button>

                        {onUnassign && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onUnassign(asset)}
                          >
                            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                            Unassign
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4">
                  <p className="text-sm text-muted-foreground">
                    This asset is not currently assigned to anyone.
                  </p>
                </div>
              )}
            </section>

            {/* ==================================================
                SOFTWARE LICENSE
            ================================================== */}

            {asset.license && (
              <>
                <Separator />

                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Software license
                  </h3>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <Field label="Vendor" value={asset.license.vendor} />

                    <Field label="Type" value={asset.license.licenseType} />

                    <Field
                      label="Seats"
                      value={`${asset.license.assignedSeats} / ${asset.license.totalSeats}`}
                    />
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    License reference hidden — visible to roles with license
                    view permission.
                  </p>
                </section>
              </>
            )}

            {/* ==================================================
                ASSET HISTORY
            ================================================== */}

            <Separator />

            <section>
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Asset history
              </h3>

              {/* ==================================================
                  LOADING
              ================================================== */}

              {(historyLoading || historyFetching) && (
                <div className="rounded-lg border border-dashed p-4">
                  <p className="text-sm text-muted-foreground">
                    Loading asset history...
                  </p>
                </div>
              )}

              {/* ==================================================
                  HISTORY
              ================================================== */}

              {!historyLoading && !historyFetching && history.length > 0 && (
                <ol className="space-y-4 border-l pl-4">
                  {history.map((item: AssetHistory) => (
                    <li key={item.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-background" />

                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </p>

                      <p className="mt-0.5 text-sm text-foreground">
                        {formatHistoryAction(item)}
                      </p>

                      {item.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}

              {/* ==================================================
                  EMPTY
              ================================================== */}

              {!historyLoading && !historyFetching && history.length === 0 && (
                <div className="rounded-lg border border-dashed p-4">
                  <p className="text-sm text-muted-foreground">
                    No history yet.
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ============================================================
// HISTORY ACTION FORMATTER
// ============================================================

function formatHistoryAction(history: AssetHistory) {
  switch (history.action?.toUpperCase()) {
    case "TRANSFERRED":
      return `Asset transferred${
        history.fromValue ? ` from ${history.fromValue}` : ""
      }${history.toValue ? ` to ${history.toValue}` : ""}`;

    case "ASSIGNED":
      return `Asset assigned${history.toValue ? ` to ${history.toValue}` : ""}`;

    case "RETURNED":
      return "Asset returned to inventory";

    case "STATUS_CHANGED":
      return `Asset status changed${
        history.toValue ? ` to ${history.toValue}` : ""
      }`;

    case "LOCATION_CHANGED":
      return `Asset location changed${
        history.fromValue ? ` from ${history.fromValue}` : ""
      }${history.toValue ? ` to ${history.toValue}` : ""}`;

    case "CREATED":
      return "Asset added to inventory";

    default:
      return history.action || "Asset updated";
  }
}

export default AssetDetailDrawer;
