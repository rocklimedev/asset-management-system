import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Layers,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  SOFTWARE_SUBSCRIPTION_OPTIONS,
  SOFTWARE_USAGE_OPTIONS,
  useDeleteSoftwareLicenseMutation,
  useDeleteSoftwareMutation,
  useGetSoftwareInstallationsQuery,
  useGetSoftwareLicensesQuery,
  useGetSoftwareListQuery,
  useGetSoftwareSummaryQuery,
  useRemoveSoftwareInstallationMutation,
  type SoftwareLicenseRecord,
  type SoftwareListParams,
  type SoftwareRecord,
  type SoftwareSubscriptionType,
  type SoftwareUsage,
} from "../services/api/software.api";

import { apiErrorMessage } from "@/types/systems";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

import { SoftwareFormModal } from "../components/asset-manager/SoftwareFormModal";
import { SoftwareLicenseModal } from "../components/asset-manager/SoftwareLicenseModal";

// ============================================================
// CONSTANTS
// ============================================================

const PAGE_SIZE = 20;

const SELECT_CLASSES =
  "h-10 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-ring";

// ============================================================
// TYPES
// ============================================================

type SoftwareListResponse = {
  data?: SoftwareRecord[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type SoftwareQueryResult = SoftwareListResponse | SoftwareRecord[] | undefined;

// ============================================================
// HELPERS
// ============================================================

const USAGE_STYLES: Record<SoftwareUsage, string> = {
  IN_USE: "bg-success-muted text-success-strong",
  NOT_IN_USE: "bg-muted text-muted-foreground",
  OCCASIONAL: "bg-info-muted text-info-strong",
  TRIAL: "bg-warning-muted text-warning-strong",
  BLOCKED: "bg-destructive-muted text-destructive-strong",
  UNKNOWN: "bg-muted text-muted-foreground",
};

const labelOf = <T extends string>(
  options: { value: T; label: string }[],
  value: T,
) => options.find((option) => option.value === value)?.label ?? value;

const fmtDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

const isExpired = (value?: string | null) =>
  Boolean(value && new Date(value).getTime() < Date.now());

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function UsageBadge({ usage }: { usage: SoftwareUsage }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
        USAGE_STYLES[usage] ?? USAGE_STYLES.UNKNOWN
      }`}
    >
      {labelOf(SOFTWARE_USAGE_OPTIONS, usage)}
    </span>
  );
}

// ============================================================
// DETAIL PANEL
// ============================================================

function SoftwareDetailPanel({
  software,
  onClose,
  onEdit,
}: {
  software: SoftwareRecord;
  onClose: () => void;
  onEdit: (software: SoftwareRecord) => void;
}) {
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] =
    useState<SoftwareLicenseRecord | null>(null);

  /*
   * Your API response contains:
   *
   * software.assetId
   * software.asset
   *
   * Therefore licenses/installations are requested against assetId.
   */

  const { data: licenses = [], isFetching: loadingLicenses } =
    useGetSoftwareLicensesQuery({
      assetId: software.assetId,
    });

  const { data: installations = [], isFetching: loadingInstalls } =
    useGetSoftwareInstallationsQuery({
      softwareAssetId: software.assetId,
      status: "ACTIVE",
    });

  const [removeInstallation, removeState] =
    useRemoveSoftwareInstallationMutation();

  const [deleteLicense, deleteLicenseState] =
    useDeleteSoftwareLicenseMutation();

  const busy = removeState.isLoading || deleteLicenseState.isLoading;

  async function handleRemoveInstallation(id: string) {
    try {
      await removeInstallation({
        id,
        notes: "Removed from software catalog",
      }).unwrap();

      toast.add({
        title: "Installation removed",
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Could not remove installation",
        description: apiErrorMessage(error),
        type: "error",
      });
    }
  }

  async function handleDeleteLicense(license: SoftwareLicenseRecord) {
    const confirmed = window.confirm(
      `Delete license "${license.vendor} · ${license.licenseType}"?`,
    );

    if (!confirmed) return;

    try {
      await deleteLicense(license.id).unwrap();

      toast.add({
        title: "License deleted",
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Could not delete license",
        description: apiErrorMessage(error),
        type: "error",
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* SCRIM */}
      <button
        type="button"
        aria-label="Close software details"
        className="absolute inset-0 cursor-default bg-scrim"
        onClick={onClose}
      />

      {/* DRAWER */}
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-border bg-card shadow-overlay">
        {/* HEADER */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card p-5">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">
              {software.asset?.assetTag ?? "No tag"}
            </p>

            <h2 className="mt-1 truncate text-xl font-semibold text-foreground">
              {software.asset?.name ?? "Unnamed software"}
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <UsageBadge usage={software.usage} />

              <span className="text-xs text-muted-foreground">
                {labelOf(
                  SOFTWARE_SUBSCRIPTION_OPTIONS,
                  software.subscriptionType,
                )}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => onEdit(software)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* OVERVIEW */}
        <div className="grid grid-cols-2 gap-3 border-b border-border p-5">
          {[
            ["Publisher", software.publisher],
            ["Version", software.version],
            ["Edition", software.edition],
            ["Parent", software.parentSoftware?.name],
            ["Warranty / support", software.warrantyApplicable ? "Yes" : "No"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-border bg-background p-3"
            >
              <p className="text-xs text-muted-foreground">{label}</p>

              <p className="mt-1 break-words text-sm font-medium text-foreground">
                {value || "—"}
              </p>
            </div>
          ))}

          {/* ASSET INFO FROM YOUR API */}
          <div className="col-span-2 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Manufacturer</p>

              <p className="mt-1 text-sm font-medium text-foreground">
                {software.asset?.manufacturer || "—"}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Asset status</p>

              <p className="mt-1 text-sm font-medium text-foreground">
                {software.asset?.status || "—"}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Tracking</p>

              <p className="mt-1 text-sm font-medium text-foreground">
                {software.asset?.trackingMode || "—"}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Quantity</p>

              <p className="mt-1 text-sm font-medium text-foreground">
                {software.asset?.quantity ?? "—"}
              </p>
            </div>
          </div>

          {software.notes ? (
            <div className="col-span-2 rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground">Notes</p>

              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                {software.notes}
              </p>
            </div>
          ) : null}
        </div>

        {/* LICENSES */}
        <div className="border-b border-border p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-medium text-foreground">
              <KeyRound className="h-4 w-4" />
              Licenses ({licenses.length})
            </h3>

            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                setEditingLicense(null);
                setLicenseModalOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add license
            </Button>
          </div>

          {loadingLicenses ? (
            <p className="text-xs text-muted-foreground">Loading licenses…</p>
          ) : null}

          <div className="space-y-2">
            {licenses.map((license) => {
              const totalSeats = Math.max(Number(license.totalSeats ?? 0), 1);

              const assignedSeats = Number(license.assignedSeats ?? 0);

              const percent = Math.min(
                100,
                Math.round((assignedSeats / totalSeats) * 100),
              );

              const expired = isExpired(license.expiryDate);

              return (
                <div
                  key={license.id}
                  className="rounded-lg border border-border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {license.vendor} · {license.licenseType}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {license.licenseReference || "No reference"} · Expires{" "}
                        {fmtDate(license.expiryDate)}
                        {expired ? (
                          <span className="ml-1 font-medium text-destructive-strong">
                            (expired)
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          setEditingLicense(license);
                          setLicenseModalOpen(true);
                        }}
                        title="Edit license"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => handleDeleteLicense(license)}
                        title="Delete license"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>
                        {assignedSeats} of {totalSeats} seats used
                      </span>

                      <span>{percent}%</span>
                    </div>

                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-1.5 rounded-full ${
                          percent >= 100
                            ? "bg-destructive-strong"
                            : "bg-primary"
                        }`}
                        style={{
                          width: `${percent}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {!loadingLicenses && licenses.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No licenses recorded for this software.
              </p>
            ) : null}
          </div>
        </div>

        {/* INSTALLATIONS */}
        <div className="p-5">
          <h3 className="mb-3 flex items-center gap-2 font-medium text-foreground">
            <Package className="h-4 w-4" />
            Installed on ({installations.length})
          </h3>

          {loadingInstalls ? (
            <p className="text-xs text-muted-foreground">
              Loading installations…
            </p>
          ) : null}

          <div className="space-y-2">
            {installations.map((install) => (
              <div
                key={install.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className="mr-auto min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {install.system?.name ??
                      install.systemId ??
                      "Unknown system"}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {install.system?.employee?.name ?? "No employee"} ·{" "}
                    {install.version ? `v${install.version} · ` : ""}
                    {install.license
                      ? `${install.license.vendor} license`
                      : "No license"}{" "}
                    · {fmtDate(install.installedAt)}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => handleRemoveInstallation(install.id)}
                >
                  Remove
                </Button>
              </div>
            ))}

            {!loadingInstalls && installations.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Not installed on any system. Install it from a system&apos;s
                detail page.
              </p>
            ) : null}
          </div>
        </div>
      </aside>

      <SoftwareLicenseModal
        open={licenseModalOpen}
        assetId={software.assetId}
        license={editingLicense}
        defaultVendor={software.publisher}
        onClose={() => {
          setLicenseModalOpen(false);
          setEditingLicense(null);
        }}
      />
    </div>
  );
}

// ============================================================
// LIST
// ============================================================

export function SoftwareList() {
  const [search, setSearch] = useState("");
  const [usage, setUsage] = useState<SoftwareUsage | "">("");
  const [subscriptionType, setSubscriptionType] = useState<
    SoftwareSubscriptionType | ""
  >("");

  const [rootOnly, setRootOnly] = useState(false);

  const [sortBy, setSortBy] =
    useState<NonNullable<SoftwareListParams["sortBy"]>>("createdAt");

  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);

  const [editing, setEditing] = useState<SoftwareRecord | null>(null);

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
    data: rawData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetSoftwareListQuery(queryArgs);

  const { data: summary } = useGetSoftwareSummaryQuery();

  /*
   * Supports both:
   *
   * 1. {
   *      data: [...],
   *      pagination: {...}
   *    }
   *
   * 2. [...]
   *
   * Your shown API response is #1.
   */
  const response = rawData as SoftwareQueryResult;

  const rows: SoftwareRecord[] = Array.isArray(response)
    ? response
    : (response?.data ?? []);

  const pagination = Array.isArray(response) ? undefined : response?.pagination;

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const [deleteSoftware, deleteState] = useDeleteSoftwareMutation();

  // ============================================================
  // ACTIONS
  // ============================================================

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(software: SoftwareRecord) {
    setEditing(software);
    setFormOpen(true);
  }

  async function handleDelete(software: SoftwareRecord) {
    const name = software.asset?.name ?? "this software";

    const confirmed = window.confirm(
      `Delete catalog details for "${name}"?\n\nThe asset itself will be kept.`,
    );

    if (!confirmed) return;

    try {
      await deleteSoftware(software.id).unwrap();

      if (selectedId === software.id) {
        setSelectedId(null);
      }

      toast.add({
        title: "Software deleted",
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Could not delete software",
        description: apiErrorMessage(error),
        type: "error",
      });
    }
  }

  function clearFilters() {
    setSearch("");
    setUsage("");
    setSubscriptionType("");
    setRootOnly(false);
    setSortBy("createdAt");
    setPage(1);
  }

  const hasFilters = Boolean(search || usage || subscriptionType || rootOnly);

  const attention =
    (summary?.licenses.expired ?? 0) + (summary?.licenses.expiringSoon ?? 0);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Software</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Catalog of software, licenses and installations.
          </p>
        </div>

        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add software
        </Button>
      </div>

      {/* SUMMARY */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Software titles</p>

          <p className="mt-2 text-2xl font-semibold text-foreground">
            {summary?.software.total ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">Active installations</p>

          <p className="mt-2 text-2xl font-semibold text-foreground">
            {summary?.installations.active ?? "—"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">License seats used</p>

          <p className="mt-2 text-2xl font-semibold text-foreground">
            {summary
              ? `${summary.licenses.assignedSeats} / ${summary.licenses.totalSeats}`
              : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <p className="text-sm text-muted-foreground">
            Licenses needing attention
          </p>

          <p className="mt-2 text-2xl font-semibold text-foreground">
            {summary ? attention : "—"}
          </p>
        </div>
      </div>

      {summary && summary.software.withoutActiveInstallations > 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5 text-warning-strong" />
          {summary.software.withoutActiveInstallations} software title(s) are
          not installed anywhere.
        </p>
      ) : null}

      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />

          <Input
            aria-label="Search software"
            placeholder="Search name, tag or publisher"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>

        <select
          aria-label="Filter by usage"
          value={usage}
          onChange={(event) =>
            setUsage(event.target.value as SoftwareUsage | "")
          }
          className={SELECT_CLASSES}
        >
          <option value="">All usage</option>

          {SOFTWARE_USAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by licensing model"
          value={subscriptionType}
          onChange={(event) =>
            setSubscriptionType(
              event.target.value as SoftwareSubscriptionType | "",
            )
          }
          className={SELECT_CLASSES}
        >
          <option value="">All licensing</option>

          {SOFTWARE_SUBSCRIPTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort by"
          value={sortBy}
          onChange={(event) =>
            setSortBy(
              event.target.value as NonNullable<SoftwareListParams["sortBy"]>,
            )
          }
          className={SELECT_CLASSES}
        >
          <option value="createdAt">Newest</option>
          <option value="name">Name (A–Z)</option>
          <option value="publisher">Publisher (A–Z)</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={rootOnly}
            onChange={(event) => setRootOnly(event.target.checked)}
            className="rounded border-border text-primary focus:ring-ring"
          />
          Top-level only
        </label>

        {hasFilters ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {/* TABLE */}
      {isLoading ? (
        <p role="status" className="text-muted-foreground">
          Loading software…
        </p>
      ) : isError ? (
        <div
          role="alert"
          className="rounded-xl border border-border bg-card p-6"
        >
          <p className="text-sm text-foreground">Could not load software.</p>

          <Button variant="outline" className="mt-3" onClick={refetch}>
            Retry
          </Button>
        </div>
      ) : (
        <div
          className={`overflow-x-auto rounded-xl border border-border bg-card shadow-card ${
            isFetching ? "opacity-70" : ""
          }`}
        >
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Software</th>

                <th className="px-4 py-3 font-medium">Publisher</th>

                <th className="px-4 py-3 font-medium">Version</th>

                <th className="px-4 py-3 font-medium">Usage</th>

                <th className="px-4 py-3 font-medium">Licensing</th>

                <th className="px-4 py-3 font-medium">Parent</th>

                <th className="px-4 py-3 text-right font-medium">Installs</th>

                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setSelectedId(row.id)}
                  className={`cursor-pointer border-b border-border last:border-0 hover:bg-muted/40 ${
                    selectedId === row.id ? "bg-primary/5" : ""
                  }`}
                >
                  {/* SOFTWARE */}
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {row.asset?.name ?? "Unnamed software"}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {row.asset?.assetTag ?? "No asset tag"}
                    </p>
                  </td>

                  {/* PUBLISHER */}
                  <td className="px-4 py-3 text-foreground">
                    {row.publisher ?? row.asset?.manufacturer ?? "—"}
                  </td>

                  {/* VERSION */}
                  <td className="px-4 py-3 text-foreground">
                    {row.version ?? "—"}

                    {row.edition ? (
                      <span className="block text-xs text-muted-foreground">
                        {row.edition}
                      </span>
                    ) : null}
                  </td>

                  {/* USAGE */}
                  <td className="px-4 py-3">
                    <UsageBadge usage={row.usage ?? "UNKNOWN"} />
                  </td>

                  {/* LICENSING */}
                  <td className="px-4 py-3 text-foreground">
                    {labelOf(
                      SOFTWARE_SUBSCRIPTION_OPTIONS,
                      row.subscriptionType,
                    )}
                  </td>

                  {/* PARENT */}
                  <td className="px-4 py-3 text-foreground">
                    {row.parentSoftware ? (
                      <span className="inline-flex items-center gap-1">
                        <Layers className="h-3 w-3 text-muted-foreground" />

                        {row.parentSoftware.name}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  {/* INSTALLATIONS */}
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {row.activeInstallations ?? 0}
                  </td>

                  {/* ACTIONS */}
                  <td className="px-4 py-3">
                    <div
                      className="flex justify-end gap-1"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Edit"
                        onClick={() => openEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        title="Delete"
                        disabled={deleteState.isLoading}
                        onClick={() => handleDelete(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-muted-foreground">
              {hasFilters
                ? "No software matches your filters."
                : "No software in the catalog yet. Add your first one."}
            </p>
          ) : null}
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
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* DETAIL DRAWER */}
      {selected ? (
        <SoftwareDetailPanel
          software={selected}
          onClose={() => setSelectedId(null)}
          onEdit={openEdit}
        />
      ) : null}

      {/* CREATE / EDIT */}
      <SoftwareFormModal
        open={formOpen}
        software={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

export default SoftwareList;
