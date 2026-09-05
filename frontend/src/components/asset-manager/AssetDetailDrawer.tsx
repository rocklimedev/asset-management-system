
import { X, Clock, ArrowRightLeft } from "lucide-react";
import { createPortal } from "react-dom";

import { useGetAssetHistoryQuery } from "../../services/api/asset.api";
import { StatusBadge } from "../ui/Badge";

import type { Asset, AssetHistory } from "../../services/api/asset.api";
// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 text-sm text-slate-800">
        {value ?? "—"}
      </p>
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
  onEdit: (asset: Asset) => void;   // add this
}

export function AssetDetailDrawer({
  asset,
  onClose,
  onTransfer,
  onEdit,           // add this
}: AssetDetailDrawerProps) {

  // ============================================history = [],==============
  // ASSET HISTORY
  // ==========================================================

const {
  data: historyResponse,
  isLoading: historyLoading,
  isFetching: historyFetching,
} = useGetAssetHistoryQuery(
  asset?.id != null ? String(asset.id) : "",
  {
    skip: asset?.id == null,
  }
);

const history = historyResponse?.data ?? [];
  // ==========================================================
  // DON'T RENDER
  // ==========================================================

  if (!asset) return null;

  // ==========================================================
  // CURRENT ASSIGNEE
  // ==========================================================

  const currentAssignee = asset.assignments?.[0]?.employee;

  // ==========================================================
  // CONDITION
  // ==========================================================

  const condition = asset.condition
    ? asset.condition.charAt(0) +
      asset.condition.slice(1).toLowerCase()
    : "Unknown";

  // ==========================================================
  // DATE HELPER
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* BACKDROP */}

      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />

      {/* DRAWER */}

      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl">
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">
              {asset.name || "Unnamed asset"}
            </h2>

            <p className="text-xs tabular-nums text-slate-500">
              {asset.assetTag || "No asset tag"}
            </p>
          </div>
<button
  type="button"
  onClick={() => onEdit(asset)}
  className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
>
  Edit
</button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close asset details"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ==================================================
            CONTENT
        ================================================== */}

        <div className="flex-1 space-y-6 px-6 py-5">
          {/* ==================================================
              STATUS
          ================================================== */}

          <div className="flex items-center gap-2">
            <StatusBadge status={asset.status} />

            <span className="text-xs text-slate-400">·</span>

            <span className="text-xs text-slate-500">
              {condition} condition
            </span>
          </div>

          {/* ==================================================
              ASSET INFORMATION
          ================================================== */}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Asset information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Category"
                value={asset.category?.name}
              />

              <Field
                label="Manufacturer"
                value={asset.manufacturer}
              />

              <Field
                label="Model"
                value={asset.model}
              />

              <Field
                label="Serial number"
                value={asset.serialNumber}
              />

              <Field
                label="Location"
                value={asset.location?.name}
              />
            </div>
          </section>

          {/* ==================================================
              ASSIGNMENT
          ================================================== */}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Assignment
            </h3>

            {currentAssignee ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {currentAssignee.name}
                  </p>

                  <p className="text-xs text-slate-500">
                    Assigned{" "}
                    {formatDate(
                      asset.assignments?.[0]?.assignedAt
                    )}
                  </p>
                </div>

                {asset.status?.toUpperCase() === "ASSIGNED" && (
                  <button
                    type="button"
                    onClick={() => onTransfer(asset)}
                    className="ml-3 flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />

                    Transfer
                  </button>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                This asset is not currently assigned to anyone.
              </p>
            )}
          </section>

          {/* ==================================================
              SOFTWARE LICENSE
          ================================================== */}

          {asset.license && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Software license
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Vendor"
                  value={asset.license.vendor}
                />

                <Field
                  label="Type"
                  value={asset.license.licenseType}
                />

                <Field
                  label="Seats"
                  value={`${asset.license.assignedSeats} / ${asset.license.totalSeats}`}
                />

              </div>

              <p className="mt-2 text-xs text-slate-400">
                License reference hidden — visible to roles with
                license view permission.
              </p>
            </section>
          )}

          {/* ==================================================
              ASSET HISTORY
          ================================================== */}

          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Clock className="h-3.5 w-3.5" />

              Asset history
            </h3>

            {/* LOADING */}

            {(historyLoading || historyFetching) && (
              <div className="space-y-3 border-l border-slate-200 pl-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="animate-pulse">
                    <div className="h-2.5 w-24 rounded bg-slate-200" />

                    <div className="mt-2 h-3 w-48 rounded bg-slate-200" />

                    <div className="mt-1 h-2.5 w-20 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            )}

            {/* HISTORY */}

            {!historyLoading &&
              !historyFetching &&
              history.length > 0 && (
                <ol className="space-y-3 border-l border-slate-200 pl-4">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className="relative"
                    >
                      <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-brand-500" />

                      <p className="text-xs text-slate-400">
                        {formatDateTime(item.createdAt)}
                      </p>

                      <p className="text-sm text-slate-800">
                        {formatHistoryAction(item)}
                      </p>

                      {/* NOTES */}

                      {item.notes && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {item.notes}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}

            {/* EMPTY */}

            {!historyLoading &&
              !historyFetching &&
              history.length === 0 && (
                <p className="text-sm text-slate-400">
                  No history yet.
                </p>
              )}
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============================================================
// HISTORY ACTION FORMATTER
// ============================================================

function formatHistoryAction(history: AssetHistory) {
  switch (history.action?.toUpperCase()) {
    case "TRANSFERRED":
      return `Asset transferred${
        history.fromValue
          ? ` from ${history.fromValue}`
          : ""
      }${
        history.toValue
          ? ` to ${history.toValue}`
          : ""
      }`;

    case "ASSIGNED":
      return `Asset assigned${
        history.toValue
          ? ` to ${history.toValue}`
          : ""
      }`;

    case "RETURNED":
      return "Asset returned to inventory";

    case "STATUS_CHANGED":
      return `Asset status changed${
        history.toValue
          ? ` to ${history.toValue}`
          : ""
      }`;

    case "LOCATION_CHANGED":
      return `Asset location changed${
        history.fromValue
          ? ` from ${history.fromValue}`
          : ""
      }${
        history.toValue
          ? ` to ${history.toValue}`
          : ""
      }`;

    case "CREATED":
      return "Asset added to inventory";

    default:
      return history.action || "Asset updated";
  }
}

export default AssetDetailDrawer;
