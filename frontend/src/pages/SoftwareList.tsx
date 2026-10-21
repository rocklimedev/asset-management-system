import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import {
  SOFTWARE_SUBSCRIPTION_OPTIONS,
  SOFTWARE_USAGE_OPTIONS,
  useDeleteSoftwareMutation,
  useGetSoftwareListQuery,
  useGetSoftwareSummaryQuery,
  type SoftwareListParams,
  type SoftwareRecord,
  type SoftwareSubscriptionType,
  type SoftwareUsage,
} from "../services/api/software.api";

import { apiErrorMessage } from "@/types/systems";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { RowActions } from "@/components/ui/row-actions";
import { toast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/layout/PageHeader";

import { QuickAddSoftware } from "../components/quick/QuickAddSoftware";
import { SoftwareFormModal } from "../components/asset-manager/SoftwareFormModal";
import { SoftwareDetailDrawer } from "../components/software/SoftwareDetailDrawer";
import {
  UsageBadge,
  licensingLabel,
} from "../components/software/software-ui";

// ============================================================
// SOFTWARE & LICENSES
//
// Kept deliberately simple: search, one filter, a clean list.
// Adding software is a 3-step dialog (QuickAddSoftware). Licenses,
// seats and installs live in the drawer that opens from a row.
// ============================================================

const PAGE_SIZE = 20;

const SELECT_CLASSES =
  "h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-inset outline-none focus-visible:ring-2 focus-visible:ring-ring";

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SoftwareList() {
  const [search, setSearch] = useState("");
  const [usage, setUsage] = useState<SoftwareUsage | "">("");

  // Rarely needed, so they stay tucked away until asked for.
  const [showMore, setShowMore] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState<
    SoftwareSubscriptionType | ""
  >("");
  const [rootOnly, setRootOnly] = useState(false);
  const [sortBy, setSortBy] =
    useState<NonNullable<SoftwareListParams["sortBy"]>>("createdAt");

  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<SoftwareRecord | null>(null);

  const confirm = useConfirm();
  const debouncedSearch = useDebounced(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, usage, subscriptionType, rootOnly, sortBy]);

  const queryArgs: SoftwareListParams = {
    search: debouncedSearch || undefined,
    usage: usage || undefined,
    subscriptionType: subscriptionType || undefined,
    rootOnly: rootOnly || undefined,
    sortBy,
    sortDir: sortBy === "createdAt" ? "DESC" : "ASC",
    page,
    limit: PAGE_SIZE,
  };

  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetSoftwareListQuery(queryArgs);

  const { data: summary } = useGetSoftwareSummaryQuery();
  const [deleteSoftware, deleteState] = useDeleteSoftwareMutation();

  const rows: SoftwareRecord[] = Array.isArray(response)
    ? response
    : (response?.data ?? []);
  const pagination = Array.isArray(response) ? undefined : response?.pagination;
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const extraFilters = [subscriptionType, rootOnly, sortBy !== "createdAt"].filter(
    Boolean,
  ).length;
  const hasFilters = Boolean(search || usage || extraFilters);

  const attention =
    (summary?.licenses?.expired ?? 0) + (summary?.licenses?.expiringSoon ?? 0);
  const unused = summary?.software.withoutActiveInstallations ?? 0;

  function clearFilters() {
    setSearch("");
    setUsage("");
    setSubscriptionType("");
    setRootOnly(false);
    setSortBy("createdAt");
  }

  async function handleDelete(software: SoftwareRecord) {
    const name = software.asset?.name ?? "this software";
    const confirmed = await confirm({
      title: `Delete ${name}?`,
      description:
        "Its catalog details will be removed. The asset itself is kept.",
      confirmLabel: "Delete software",
      tone: "danger",
    });
    if (!confirmed) return;

    try {
      await deleteSoftware(software.id).unwrap();
      if (selectedId === software.id) setSelectedId(null);
      toast.add({ title: "Software deleted", type: "success" });
    } catch (error) {
      toast.add({
        title: "Could not delete software",
        description: apiErrorMessage(error),
        type: "error",
      });
    }
  }

  const addButton = (
    <Button onClick={() => setAddOpen(true)}>
      <Plus aria-hidden="true" />
      Add software
    </Button>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Software & Licenses"
        description="The software your team uses, what you paid for, and where it is installed."
        actions={addButton}
      />

      {/* One quiet line instead of four stat cards */}
      {summary ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {summary.software.total}
          </span>{" "}
          titles ·{" "}
          <span className="font-medium text-foreground">
            {summary.installations.active}
          </span>{" "}
          installs ·{" "}
          <span className="font-medium text-foreground">
            {summary.licenses.assignedSeats} of {summary.licenses.totalSeats}
          </span>{" "}
          seats used
          {attention > 0 ? (
            <>
              {" "}
              ·{" "}
              <span className="font-medium text-warning-strong">
                {attention} license{attention === 1 ? "" : "s"} expired or
                expiring soon
              </span>
            </>
          ) : null}
          {unused > 0 ? <> · {unused} not installed anywhere</> : null}
        </p>
      ) : null}

      {/* FILTERS */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-60 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Search software"
              placeholder="Search by name or publisher"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <select
            aria-label="Filter by status"
            value={usage}
            onChange={(e) => setUsage(e.target.value as SoftwareUsage | "")}
            className={SELECT_CLASSES}
          >
            <option value="">Any status</option>
            {SOFTWARE_USAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <Button
            variant="ghost"
            aria-expanded={showMore}
            onClick={() => setShowMore((v) => !v)}
          >
            <SlidersHorizontal aria-hidden="true" />
            More filters{extraFilters ? ` (${extraFilters})` : ""}
          </Button>

          {hasFilters ? (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          ) : null}
        </div>

        {showMore ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
            <select
              aria-label="Filter by how it is paid for"
              value={subscriptionType}
              onChange={(e) =>
                setSubscriptionType(
                  e.target.value as SoftwareSubscriptionType | "",
                )
              }
              className={SELECT_CLASSES}
            >
              <option value="">Any payment type</option>
              {SOFTWARE_SUBSCRIPTION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort by"
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as NonNullable<SoftwareListParams["sortBy"]>,
                )
              }
              className={SELECT_CLASSES}
            >
              <option value="createdAt">Newest first</option>
              <option value="name">Name (A–Z)</option>
              <option value="publisher">Publisher (A–Z)</option>
            </select>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={rootOnly}
                onChange={(e) => setRootOnly(e.target.checked)}
                className="rounded border-border text-primary focus:ring-ring"
              />
              Hide add-ons (top-level only)
            </label>
          </div>
        ) : null}
      </div>

      {/* LIST */}
      {isLoading ? (
        <div
          role="status"
          aria-label="Loading software"
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border px-4 py-4 last:border-0"
            >
              <div className="h-4 w-48 animate-pulse rounded bg-muted" />
              <div className="ml-auto h-4 w-24 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div
          role="alert"
          className="rounded-xl border border-border bg-card p-6"
        >
          <p className="text-sm text-foreground">
            Couldn&apos;t load your software.
          </p>
          <Button variant="outline" className="mt-3" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No software matches" : "No software yet"}
          description={
            hasFilters
              ? "Try a different search or clear the filters."
              : "Add the first one. It takes three short steps."
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              addButton
            )
          }
        />
      ) : (
        <div
          className={`overflow-x-auto rounded-xl border border-border bg-card shadow-card ${
            isFetching ? "opacity-70" : ""
          }`}
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Software</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Paid for
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                  Installed
                </th>
                <th className="w-12 px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const name = row.asset?.name ?? "Unnamed software";
                const sub = [
                  row.publisher ?? row.asset?.manufacturer,
                  row.version ? `v${row.version}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={`cursor-pointer border-b border-border last:border-0 hover:bg-muted/40 ${
                      selectedId === row.id ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-left font-medium text-foreground outline-none hover:underline focus-visible:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(row.id);
                        }}
                      >
                        {name}
                      </button>
                      {sub ? (
                        <p className="text-xs text-muted-foreground">{sub}</p>
                      ) : null}
                    </td>

                    <td className="hidden px-4 py-3 text-foreground md:table-cell">
                      {licensingLabel(row.subscriptionType)}
                    </td>

                    <td className="px-4 py-3">
                      <UsageBadge usage={row.usage ?? "UNKNOWN"} />
                    </td>

                    <td className="hidden px-4 py-3 text-right tabular-nums text-foreground sm:table-cell">
                      {row.activeInstallations ?? 0}
                    </td>

                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActions
                        recordName={name}
                        items={[
                          {
                            label: "View licenses & installs",
                            icon: Eye,
                            onSelect: () => setSelectedId(row.id),
                          },
                          {
                            label: "Edit details",
                            icon: Pencil,
                            onSelect: () => setEditing(row),
                          },
                          {
                            label: "Delete",
                            icon: Trash2,
                            destructive: true,
                            separatorBefore: true,
                            disabled: deleteState.isLoading,
                            onSelect: () => handleDelete(row),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* PAGINATION */}
      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ·{" "}
            {pagination.total} titles
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft aria-hidden="true" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {selected ? (
        <SoftwareDetailDrawer
          software={selected}
          onClose={() => setSelectedId(null)}
          onEdit={(software) => setEditing(software)}
        />
      ) : null}

      <QuickAddSoftware open={addOpen} onClose={() => setAddOpen(false)} />

      <SoftwareFormModal
        open={Boolean(editing)}
        software={editing}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

export default SoftwareList;
