import {
  X,
  Clock,
  ArrowRightLeft,
  Undo2,
  UserRound,
  Monitor,
  Package,
} from "lucide-react";

import {
  useGetAssetHistoryQuery,
  useGetActiveAssetAssignmentsByAssetQuery,
} from "../../services/api/asset.api";

import { Badge } from "../ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import type {
  Asset,
  AssetHistory,
  AssetAssignment,
} from "../../services/api/asset.api";

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

  const history: AssetHistory[] = Array.isArray(historyResponse)
    ? (historyResponse as AssetHistory[])
    : [];

  // ==========================================================
  // ACTIVE ASSIGNMENTS
  // ==========================================================

  const {
    data: activeAssignmentsResponse,
    isLoading: assignmentLoading,
    isFetching: assignmentFetching,
  } = useGetActiveAssetAssignmentsByAssetQuery(
    asset?.id != null ? String(asset.id) : "",
    {
      skip: asset?.id == null,
    },
  );

  /*
   * Quantity-tracked assets can have multiple active assignments.
   *
   * Example:
   *
   * UNIT-001 -> SPRL-PC1
   * UNIT-003 -> Admin
   *
   * Therefore we intentionally keep the complete array instead
   * of selecting only [0].
   */
  const activeAssignments: AssetAssignment[] = Array.isArray(
    activeAssignmentsResponse,
  )
    ? activeAssignmentsResponse
    : [];

  // ==========================================================
  // DON'T RENDER
  // ==========================================================

  if (!asset) return null;

  // ==========================================================
  // STATUS
  // ==========================================================

  const condition = asset.condition
    ? asset.condition.charAt(0) + asset.condition.slice(1).toLowerCase()
    : "Unknown";

  const status = asset.status
    ? asset.status.charAt(0) + asset.status.slice(1).toLowerCase()
    : "Unknown";

  const isAssigned =
    asset.status?.toUpperCase() === "ASSIGNED" || activeAssignments.length > 0;

  // ==========================================================
  // DATE HELPERS
  // ==========================================================

  const formatDate = (date?: string | null) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleDateString();
  };

  const formatDateTime = (date?: string | null) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleString();
  };

  // ==========================================================
  // ASSIGNMENT LABEL
  // ==========================================================

  const getAssignmentName = (assignment: AssetAssignment) => {
    if (assignment.system) {
      return assignment.system.systemTag || assignment.system.name;
    }

    if (assignment.employee?.name) {
      return assignment.employee.name;
    }

    if (assignment.employeeId) {
      return assignment.employeeId;
    }

    if (assignment.systemId) {
      return assignment.systemId;
    }

    return "Unknown assignee";
  };

  const getAssignmentType = (assignment: AssetAssignment) => {
    if (assignment.systemId || assignment.system) {
      return "System";
    }

    return "Employee";
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* ======================================================
          BACKDROP
      ====================================================== */}

      <button
        type="button"
        aria-label="Close asset details"
        className="absolute inset-0 cursor-default bg-black/20"
        onClick={onClose}
      />

      {/* ======================================================
          PANEL
      ====================================================== */}

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
                ASSIGNMENTS
            ================================================== */}

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Assignment
                </h3>

                {!assignmentLoading &&
                  !assignmentFetching &&
                  activeAssignments.length > 0 && (
                    <Badge variant="secondary">
                      {activeAssignments.length}{" "}
                      {activeAssignments.length === 1
                        ? "assignment"
                        : "assignments"}
                    </Badge>
                  )}
              </div>

              {/* ==================================================
                  LOADING
              ================================================== */}

              {(assignmentLoading || assignmentFetching) && (
                <div className="rounded-lg border border-dashed p-4">
                  <p className="text-sm text-muted-foreground">
                    Loading assignments...
                  </p>
                </div>
              )}

              {/* ==================================================
                  ACTIVE ASSIGNMENTS
              ================================================== */}

              {!assignmentLoading &&
                !assignmentFetching &&
                activeAssignments.length > 0 && (
                  <div className="space-y-3">
                    {activeAssignments.map((assignment) => {
                      const assignmentName = getAssignmentName(assignment);

                      const assignmentType = getAssignmentType(assignment);

                      const system = assignment.system;

                      return (
                        <div
                          key={assignment.id}
                          className="rounded-lg border bg-muted/20 p-3"
                        >
                          {/* ----------------------------------------
                              ASSIGNEE
                          ---------------------------------------- */}

                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {assignmentType === "System" ? (
                                  <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" />
                                ) : (
                                  <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                                )}

                                <p className="truncate text-sm font-medium text-foreground">
                                  {system ? (
                                    <a
                                      className="underline underline-offset-4"
                                      href={`/systems?system=${system.id}`}
                                    >
                                      {assignmentName}
                                    </a>
                                  ) : (
                                    assignmentName
                                  )}
                                </p>
                              </div>

                              {/* --------------------------------------
                                  TYPE
                              -------------------------------------- */}

                              <p className="mt-1 text-xs text-muted-foreground">
                                {assignmentType}
                              </p>
                            </div>

                            <Badge variant="outline" className="shrink-0">
                              {assignment.status}
                            </Badge>
                          </div>

                          {/* ----------------------------------------
                              UNIT INFORMATION
                          ---------------------------------------- */}

                          {assignment.assetUnit && (
                            <div className="mt-3 rounded-md border bg-background p-2.5">
                              <div className="flex items-center gap-2">
                                <Package className="h-3.5 w-3.5 text-muted-foreground" />

                                <span className="text-xs font-medium">
                                  {assignment.assetUnit.unitCode}
                                </span>
                              </div>

                              <div className="mt-1 grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Serial number
                                  </p>

                                  <p className="text-xs">
                                    {assignment.assetUnit.serialNumber || "—"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Condition
                                  </p>

                                  <p className="text-xs">
                                    {assignment.assetUnit.condition
                                      ? assignment.assetUnit.condition
                                          .charAt(0)
                                          .toUpperCase() +
                                        assignment.assetUnit.condition
                                          .slice(1)
                                          .toLowerCase()
                                      : "—"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ----------------------------------------
                              ASSIGNMENT DETAILS
                          ---------------------------------------- */}

                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <Field
                              label="Assigned"
                              value={formatDate(assignment.assignedAt)}
                            />

                            <Field
                              label="Assigned at"
                              value={formatDateTime(assignment.assignedAt)}
                            />

                            {assignment.system?.name && (
                              <Field
                                label="System name"
                                value={assignment.system.name}
                              />
                            )}

                            {assignment.system?.employeeId && (
                              <Field
                                label="System employee"
                                value={assignment.system.employeeId}
                              />
                            )}
                          </div>

                          {/* ----------------------------------------
                              NOTES
                          ---------------------------------------- */}

                          {assignment.notes && (
                            <p className="mt-3 rounded-md bg-muted px-2.5 py-2 text-xs text-muted-foreground">
                              {assignment.notes}
                            </p>
                          )}

                          {/* ----------------------------------------
                              ACTIONS
                          ---------------------------------------- */}

                          <div className="mt-3 flex justify-end gap-1.5">
                            {!assignment.systemId && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onTransfer(asset)}
                              >
                                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                                Transfer
                              </Button>
                            )}

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
                        </div>
                      );
                    })}
                  </div>
                )}

              {/* ==================================================
                  NO ACTIVE ASSIGNMENTS
              ================================================== */}

              {!assignmentLoading &&
                !assignmentFetching &&
                activeAssignments.length === 0 && (
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

              {(historyLoading || historyFetching) && (
                <div className="rounded-lg border border-dashed p-4">
                  <p className="text-sm text-muted-foreground">
                    Loading asset history...
                  </p>
                </div>
              )}

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
