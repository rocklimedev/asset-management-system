import {
  History,
  Loader2,
  User,
  ArrowRight,
  CalendarDays,
  FileText,
} from "lucide-react";

import {
  useGetAssetHistoryQuery,
  type Asset,
  type AssetHistory,
} from "../../services/api/asset.api";

import { Button } from "../ui/button";

interface AssetHistoryModalProps {
  open: boolean;
  asset: Asset | null;
  onClose: () => void;
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatAction(action: string) {
  if (!action) {
    return "Unknown action";
  }

  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayValue(value?: string | null) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return value;
}

function HistoryItem({ item }: { item: AssetHistory }) {
  return (
    <div className="relative border-b border-border px-5 py-4 last:border-b-0">
      <div className="flex gap-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
          <History className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                {formatAction(item.action)}
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <User className="h-3.5 w-3.5" />
                  {item.performedBy || "System"}
                </span>

                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(item.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {(item.fromValue || item.toValue) && (
            <div className="mt-3 rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Previous
                  </p>

                  <p className="break-words text-sm text-foreground">
                    {displayValue(item.fromValue)}
                  </p>
                </div>

                <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />

                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    New
                  </p>

                  <p className="break-words text-sm text-foreground">
                    {displayValue(item.toValue)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {item.notes && (
            <div className="mt-3 flex gap-2 rounded-lg border border-border bg-card p-3">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {item.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AssetHistoryModal({
  open,
  asset,
  onClose,
}: AssetHistoryModalProps) {
  const assetId = asset?.id ?? "";

  const { data, isLoading, isFetching, isError } = useGetAssetHistoryQuery(
    assetId,
    {
      skip: !open || !assetId,
    },
  );

  if (!open || !asset) {
    return null;
  }

  const history = data?.data ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-history-title"
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />

              <h2
                id="asset-history-title"
                className="text-base font-semibold text-foreground"
              >
                Asset History
              </h2>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{asset.name}</span>

              {asset.assetTag && (
                <>
                  <span>•</span>
                  <span>{asset.assetTag}</span>
                </>
              )}
            </div>
          </div>

          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isLoading || isFetching ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading history...
              </div>
            </div>
          ) : isError ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
              <History className="mb-3 h-8 w-8 text-muted-foreground" />

              <h3 className="text-sm font-medium text-foreground">
                Unable to load history
              </h3>

              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                There was a problem loading the audit history for this asset.
              </p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
              <History className="mb-3 h-8 w-8 text-muted-foreground" />

              <h3 className="text-sm font-medium text-foreground">
                No history yet
              </h3>

              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Changes and actions performed on this asset will appear here.
              </p>
            </div>
          ) : (
            <div>
              {history.map((item) => (
                <HistoryItem key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {history.length} {history.length === 1 ? "entry" : "entries"}
          </p>

          <Button type="button" variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AssetHistoryModal;
