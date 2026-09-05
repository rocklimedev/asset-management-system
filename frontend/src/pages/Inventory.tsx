import { useState } from "react";
import { Search, Plus, ArrowUpDown } from "lucide-react";

import { useGetAssetsQuery } from "../services/api/asset.api";

import { StatusBadge } from "../components/ui/Badge";
import { Input, Select } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import {
  EmptyState,
  SkeletonCard,
} from "../components/ui/EmptyState";
import { AssetDetailDrawer } from "../components/asset-manager/AssetDetailDrawer";

import type { Asset } from "../types";

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_OPTIONS = [
  "AVAILABLE",
  "ASSIGNED",
  "REPAIR",
  "LOST",
  "DAMAGED",
  "RETIRED",
  "DISPOSED",
] as const;

const COLUMNS: {
  key: string;
  label: string;
  sortable?: boolean;
}[] = [
  { key: "assetTag", label: "Asset ID", sortable: true },
  { key: "name", label: "Name", sortable: true },
  { key: "category", label: "Category" },
  { key: "serialNumber", label: "Serial number" },
  { key: "assignedTo", label: "Assigned to" },
  { key: "status", label: "Status", sortable: true },
  { key: "condition", label: "Condition" },
  { key: "warrantyExpiry", label: "Warranty", sortable: true },
];

// ============================================================
// COMPONENT
// ============================================================

export default function Inventory() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");

  const [sortBy, setSortBy] = useState("assetTag");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Asset | null>(null);

  // ============================================================
  // RTK QUERY
  // ============================================================

  const {
    data,
    isLoading,
    isFetching,
    isError,
  } = useGetAssetsQuery({
    search: search || undefined,
    status: status || undefined,
    kind: kind || undefined,
    sortBy,
    sortDir,
    page,
    pageSize: 25,
  });

  // ============================================================
  // NORMALIZE RESPONSE
  // ============================================================

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 25;

  const totalPages =
    pageSize > 0 ? Math.ceil(total / pageSize) : 1;

  // ============================================================
  // SORT
  // ============================================================

  function toggleSort(key: string) {
    if (sortBy === key) {
      setSortDir((current) =>
        current === "asc" ? "desc" : "asc"
      );
    } else {
      setSortBy(key);
      setSortDir("asc");
    }

    setPage(1);
  }

  // ============================================================
  // FILTER HANDLERS
  // ============================================================

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleKindChange(value: string) {
    setKind(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  // ============================================================
  // PAGINATION
  // ============================================================

  function goToPreviousPage() {
    setPage((current) => Math.max(1, current - 1));
  }

  function goToNextPage() {
    setPage((current) =>
      Math.min(totalPages, current + 1)
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Inventory
          </h1>

          <p className="text-sm text-slate-500">
            All hardware and software assets, regardless of assignment.
          </p>
        </div>

        <Button className="w-fit">
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search */}

        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <Input
            value={search}
            onChange={(event) =>
              handleSearchChange(event.target.value)
            }
            placeholder="Asset ID, serial number, name, employee..."
            className="pl-9"
          />
        </div>

        {/* Asset Type */}

        <Select
          value={kind}
          onChange={(event) =>
            handleKindChange(event.target.value)
          }
          className="w-full sm:w-40"
        >
          <option value="">All types</option>
          <option value="HARDWARE">Hardware</option>
          <option value="SOFTWARE">Software</option>
        </Select>

        {/* Status */}

        <Select
          value={status}
          onChange={(event) =>
            handleStatusChange(event.target.value)
          }
          className="w-full sm:w-44"
        >
          <option value="">All statuses</option>

          {STATUS_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item.charAt(0) + item.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {isError ? (
        <EmptyState
          title="Unable to load assets"
          description="There was a problem loading the inventory. Please try again."
        />
      ) : isLoading ? (
        /* ====================================================
           INITIAL LOADING
        ==================================================== */

        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : items.length === 0 ? (
        /* ====================================================
           EMPTY STATE
        ==================================================== */

        <EmptyState
          title="No assets found"
          description="Try changing your filters, or add a new asset."
        />
      ) : (
        <>
          {/* ==================================================
              TABLE
          ================================================== */}

          <div className="relative overflow-x-auto rounded-xl border border-slate-200 bg-white">
            {/* Refresh / fetching indicator */}

            {isFetching && !isLoading && (
              <div className="absolute right-3 top-3 z-10">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              </div>
            )}

            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500">
                <tr>
                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className="whitespace-nowrap px-4 py-2.5 font-medium"
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() =>
                            toggleSort(column.key)
                          }
                          className="flex items-center gap-1 hover:text-slate-700"
                        >
                          {column.label}

                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {items.map((asset) => {
                  const assignee =
                    asset.assignments?.[0]?.employee;

                  return (
                    <tr
                      key={asset.id}
                      onClick={() => setSelected(asset)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      {/* Asset ID */}

                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-600">
                        {asset.assetTag}
                      </td>

                      {/* Name */}

                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-800">
                        {asset.name}
                      </td>

                      {/* Category */}

                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                        {asset.category?.name ?? "—"}
                      </td>

                      {/* Serial Number */}

                      <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-slate-500">
                        {asset.serialNumber ?? "—"}
                      </td>

                      {/* Assigned To */}

                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                        {assignee?.name ?? "—"}
                      </td>

                      {/* Status */}

                      <td className="whitespace-nowrap px-4 py-2.5">
                        <StatusBadge status={asset.status} />
                      </td>

                      {/* Condition */}

                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                        {asset.condition}
                      </td>

                      {/* Warranty */}

                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                        {asset.warrantyExpiry
                          ? new Date(
                              asset.warrantyExpiry
                            ).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ==================================================
              PAGINATION
          ================================================== */}

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing{" "}
              {total === 0
                ? 0
                : (page - 1) * pageSize + 1}{" "}
              -{" "}
              {Math.min(
                page * pageSize,
                total
              )}{" "}
              of {total} assets
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1 || isFetching}
                onClick={goToPreviousPage}
              >
                Previous
              </Button>

              <span className="px-1">
                Page {page} of {Math.max(totalPages, 1)}
              </span>

              <Button
                variant="secondary"
                size="sm"
                disabled={
                  page >= totalPages || isFetching
                }
                onClick={goToNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ======================================================
          ASSET DETAIL DRAWER
      ====================================================== */}

      <AssetDetailDrawer
        asset={selected}
        onClose={() => setSelected(null)}
        onTransfer={() => {}}
      />
    </div>
  );
}