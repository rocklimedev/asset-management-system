import { useState } from "react";
import {
  Search,
  Plus,
  ArrowUpDown,
  Package,
  PackagePlus,
  Boxes,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Pencil,
  History,
  Trash2,
  Loader2,
} from "lucide-react";

import {
  useGetAssetsQuery,
  useDeleteAssetMutation,
  useGetAssetCategoriesQuery,
  useAssignAssetMutation,
  useGetSystemsQuery,
  type Asset,
  type AssetKind,
  type AssetStatus,
  type SystemRecord,
} from "../services/api/asset.api";

import { Input } from "@/components/ui/input";
import { Badge } from "../components/ui/badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

import { Button } from "../components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";

import { EmptyState, SkeletonCard } from "../components/ui/EmptyState";

import { AssetDetailDrawer } from "../components/asset-manager/AssetDetailDrawer";
import { CreateAssetModal } from "../components/asset-manager/CreateAssetModal";
import { AssetHistoryModal } from "../components/asset-manager/AssetHistoryModal";
import { UpdateInventoryModal } from "../components/asset-manager/UpdateInventoryModal";
import { InventoryHistoryModal } from "../components/asset-manager/InventoryHistoryModal";

import { toast } from "../components/ui/toast";

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
  {
    key: "image",
    label: "",
  },
  {
    key: "name",
    label: "Name",
    sortable: true,
  },
  {
    key: "category",
    label: "Category",
  },
  {
    key: "quantity",
    label: "Quantity",
    sortable: true,
  },
  {
    key: "assignedTo",
    label: "Assigned to",
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
  },
  {
    key: "condition",
    label: "Condition",
  },
];

// ============================================================
// HELPERS
// ============================================================

function formatStatus(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function getStatusBadgeVariant(
  status: AssetStatus,
): "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" {
  switch (status) {
    case "AVAILABLE":
      return "default";

    case "ASSIGNED":
      return "secondary";

    case "REPAIR":
    case "LOST":
    case "DAMAGED":
      return "destructive";

    case "RETIRED":
    case "DISPOSED":
      return "outline";

    default:
      return "secondary";
  }
}

// ============================================================
// COMPONENT
// ============================================================

export default function Inventory() {
  const [search, setSearch] = useState("");

  const [status, setStatus] = useState<AssetStatus | "">("");

  const [kind, setKind] = useState<AssetKind | "">("");

  const [categoryId, setCategoryId] = useState("");

  const [sortBy, setSortBy] = useState("assetTag");

  const [sortDir, setSortDir] = useState<"ASC" | "DESC">("ASC");

  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Asset | null>(null);

  // ============================================================
  // MULTISELECT
  // ============================================================

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [assignToSystemModal, setAssignToSystemModal] = useState(false);

  const [selectedSystemId, setSelectedSystemId] = useState("");

  // ============================================================
  // ASSET MODAL
  // ============================================================

  const [assetModal, setAssetModal] = useState<{
    open: boolean;
    asset: Asset | null;
  }>({
    open: false,
    asset: null,
  });

  // ============================================================
  // HISTORY MODAL
  // ============================================================

  const [historyModal, setHistoryModal] = useState<{
    open: boolean;
    asset: Asset | null;
  }>({
    open: false,
    asset: null,
  });

  // ============================================================
  // UPDATE INVENTORY MODAL
  // ============================================================

  const [inventoryModal, setInventoryModal] = useState<{
    open: boolean;
    asset: Asset | null;
  }>({
    open: false,
    asset: null,
  });

  // ============================================================
  // INVENTORY HISTORY MODAL
  // ============================================================

  const [inventoryHistoryModal, setInventoryHistoryModal] = useState<{
    open: boolean;
    asset: Asset | null;
  }>({
    open: false,
    asset: null,
  });

  // ============================================================
  // MUTATIONS / QUERIES
  // ============================================================

  const [deleteAsset, { isLoading: isDeleting }] = useDeleteAssetMutation();

  const [assignAsset, { isLoading: isAssigning }] = useAssignAssetMutation();

  const { data: systemsData, isLoading: isSystemsLoading } =
    useGetSystemsQuery();

  const systems: SystemRecord[] = systemsData ?? [];
  // ============================================================
  // CATEGORIES
  // ============================================================

  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useGetAssetCategoriesQuery({ isActive: true });

  const categories = categoriesData ?? [];
  // ============================================================
  // RTK QUERY — ASSETS
  // ============================================================

  const { data, isLoading, isFetching, isError } = useGetAssetsQuery({
    search: search || undefined,
    status: status || undefined,
    kind: kind || undefined,
    categoryId: categoryId || undefined,
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

  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 1;

  // ============================================================
  // QUANTITY HELPERS
  // ============================================================

  function quantityAvailable(asset: Asset) {
    const quantity = asset.quantity ?? 1;
    const assigned = asset.quantityAssigned ?? 0;
    return quantity - assigned;
  }

  function isLowStock(asset: Asset) {
    const reorderLevel = asset.reorderLevel;
    if (reorderLevel == null) {
      return false;
    }
    return quantityAvailable(asset) <= reorderLevel;
  }

  function isAssignable(asset: Asset) {
    return quantityAvailable(asset) > 0;
  }

  // ============================================================
  // MULTISELECT HELPERS
  // ============================================================

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function toggleSelect(asset: Asset) {
    if (!isAssignable(asset)) return;

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) {
        next.delete(asset.id);
      } else {
        next.add(asset.id);
      }
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    const assignableOnPage = items.filter(isAssignable);
    const allSelected =
      assignableOnPage.length > 0 &&
      assignableOnPage.every((a) => selectedIds.has(a.id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        assignableOnPage.forEach((a) => next.delete(a.id));
      } else {
        assignableOnPage.forEach((a) => next.add(a.id));
      }
      return next;
    });
  }

  async function handleBulkAssignToSystem() {
    if (!selectedSystemId || selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    let success = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        await assignAsset({ id, systemId: selectedSystemId }).unwrap();
        success++;
      } catch {
        failed++;
      }
    }

    if (success > 0) {
      toast.add({
        type: "success",
        title: "Assets assigned",
        description: `${success} asset(s) assigned to system successfully.`,
      });
    }

    if (failed > 0) {
      toast.add({
        type: "error",
        title: "Some assignments failed",
        description: `${failed} asset(s) could not be assigned.`,
      });
    }

    clearSelection();
    setAssignToSystemModal(false);
    setSelectedSystemId("");
  }

  // ============================================================
  // SORT
  // ============================================================

  function toggleSort(key: string) {
    if (sortBy === key) {
      setSortDir((current) => (current === "ASC" ? "DESC" : "ASC"));
    } else {
      setSortBy(key);
      setSortDir("ASC");
    }

    setPage(1);
    clearSelection();
  }

  // ============================================================
  // FILTER HANDLERS
  // ============================================================

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    clearSelection();
  }

  function handleKindChange(value: string) {
    setKind(value === "all" ? "" : (value as AssetKind));
    setPage(1);
    clearSelection();
  }

  function handleStatusChange(value: string) {
    setStatus(value === "all" ? "" : (value as AssetStatus));
    setPage(1);
    clearSelection();
  }

  function handleCategoryChange(value: string) {
    setCategoryId(value === "all" ? "" : value);
    setPage(1);
    clearSelection();
  }

  // ============================================================
  // PAGINATION
  // ============================================================

  function goToPreviousPage() {
    setPage((current) => Math.max(1, current - 1));
    clearSelection();
  }

  function goToNextPage() {
    setPage((current) => Math.min(totalPages, current + 1));
    clearSelection();
  }

  // ============================================================
  // VIEW
  // ============================================================

  function openViewAsset(asset: Asset) {
    setAssetModal({
      open: false,
      asset: null,
    });

    setHistoryModal({
      open: false,
      asset: null,
    });

    setSelected(asset);
  }

  // ============================================================
  // CREATE
  // ============================================================

  function openCreateAsset() {
    setSelected(null);

    setAssetModal({
      open: true,
      asset: null,
    });
  }

  // ============================================================
  // UPDATE
  // ============================================================

  function openEditAsset(asset: Asset) {
    setSelected(null);

    setHistoryModal({
      open: false,
      asset: null,
    });

    setAssetModal({
      open: true,
      asset,
    });
  }

  function closeAssetModal() {
    setAssetModal({
      open: false,
      asset: null,
    });
  }

  // ============================================================
  // HISTORY
  // ============================================================

  function openHistory(asset: Asset) {
    setSelected(null);

    setAssetModal({
      open: false,
      asset: null,
    });

    setHistoryModal({
      open: true,
      asset,
    });
  }

  function closeHistory() {
    setHistoryModal({
      open: false,
      asset: null,
    });
  }

  // ============================================================
  // UPDATE INVENTORY
  // ============================================================

  function openUpdateInventory(asset: Asset) {
    setSelected(null);

    setAssetModal({
      open: false,
      asset: null,
    });

    setHistoryModal({
      open: false,
      asset: null,
    });

    setInventoryModal({
      open: true,
      asset,
    });
  }

  function closeInventoryModal() {
    setInventoryModal({
      open: false,
      asset: null,
    });
  }

  // ============================================================
  // INVENTORY HISTORY
  // ============================================================

  function openInventoryHistory(asset: Asset) {
    setSelected(null);

    setAssetModal({
      open: false,
      asset: null,
    });

    setHistoryModal({
      open: false,
      asset: null,
    });

    setInventoryHistoryModal({
      open: true,
      asset,
    });
  }

  function closeInventoryHistory() {
    setInventoryHistoryModal({
      open: false,
      asset: null,
    });
  }

  // ============================================================
  // DELETE
  // ============================================================

  async function handleDeleteAsset(asset: Asset) {
    const confirmed = window.confirm(
      `Delete "${asset.name}"?${
        asset.assetTag ? `\n\nAsset Tag: ${asset.assetTag}` : ""
      }\n\nThis action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAsset(asset.id).unwrap();

      if (selected?.id === asset.id) {
        setSelected(null);
      }

      if (historyModal.asset?.id === asset.id) {
        setHistoryModal({
          open: false,
          asset: null,
        });
      }

      if (assetModal.asset?.id === asset.id) {
        setAssetModal({
          open: false,
          asset: null,
        });
      }

      if (inventoryModal.asset?.id === asset.id) {
        setInventoryModal({
          open: false,
          asset: null,
        });
      }

      if (inventoryHistoryModal.asset?.id === asset.id) {
        setInventoryHistoryModal({
          open: false,
          asset: null,
        });
      }

      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(asset.id);
        return next;
      });

      toast.add({
        type: "success",
        title: "Asset deleted",
        description: `${asset.name} was deleted successfully.`,
      });
    } catch (error) {
      console.error("Failed to delete asset:", error);

      toast.add({
        type: "error",
        title: "Unable to delete asset",
        description: "The asset could not be deleted. Please try again.",
      });
    }
  }

  // ============================================================
  // TRANSFER
  // ============================================================

  function handleTransferFromDrawer() {
    toast.add({
      type: "info",
      title: "Transfer from Asset Manager",
      description:
        "Transfers happen from Asset Manager — open the employee's card there.",
    });
  }

  // ============================================================
  // RENDER
  // ============================================================

  const assignableOnPage = items.filter(isAssignable);
  const allAssignableSelected =
    assignableOnPage.length > 0 &&
    assignableOnPage.every((a) => selectedIds.has(a.id));

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Inventory</h1>

          <p className="text-sm text-muted-foreground">
            All hardware and software assets, regardless of assignment.
          </p>
        </div>

        <Button className="w-fit" onClick={openCreateAsset}>
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Search */}

        <div className="relative flex-1 sm:min-w-[220px] sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Asset ID, serial number, name, employee..."
            className="pl-9"
          />
        </div>

        {/* Category */}

        <Select
          value={categoryId || "all"}
          onValueChange={handleCategoryChange}
          disabled={isCategoriesLoading}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue
              placeholder={
                isCategoriesLoading ? "Loading categories..." : "All categories"
              }
            />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>

            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Asset Type */}

        <Select value={kind || "all"} onValueChange={handleKindChange}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All types</SelectItem>

            <SelectItem value="HARDWARE">Hardware</SelectItem>

            <SelectItem value="SOFTWARE">Software</SelectItem>
          </SelectContent>
        </Select>

        {/* Status */}

        <Select value={status || "all"} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>

          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>

            {STATUS_OPTIONS.map((item) => (
              <SelectItem key={item} value={item}>
                {formatStatus(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ======================================================
          ERROR / LOADING / EMPTY / TABLE
      ====================================================== */}

      {isError ? (
        <EmptyState
          title="Unable to load assets"
          description="There was a problem loading the inventory. Please try again."
        />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No assets found"
          description="Try changing your filters, or add a new asset."
        />
      ) : (
        <>
          {/* ==================================================
              BULK SELECTION BAR
          ================================================== */}

          {selectedIds.size > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
              <span className="text-sm text-foreground">
                {selectedIds.size} asset
                {selectedIds.size === 1 ? "" : "s"} selected
                <span className="text-muted-foreground">
                  {" "}
                  (available quantity only)
                </span>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAssignToSystemModal(true)}
                >
                  Assign to system
                </Button>

                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* ==================================================
              TABLE
          ================================================== */}

          <div className="relative overflow-x-auto rounded-xl border border-border bg-card">
            {isFetching && !isLoading && (
              <div className="absolute right-3 top-3 z-10">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-input border-t-slate-700" />
              </div>
            )}

            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border"
                      checked={allAssignableSelected}
                      onChange={toggleSelectAllOnPage}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Select all assignable on page"
                    />
                  </th>

                  {COLUMNS.map((column) => (
                    <th
                      key={column.key}
                      className="whitespace-nowrap px-4 py-2.5 font-medium"
                    >
                      {column.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.key)}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          {column.label}

                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  ))}

                  <th className="w-[56px] px-4 py-2.5 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {items.map((asset) => {
                  const assignee = asset.assignments?.[0]?.employee;

                  const quantity = asset.quantity ?? 1;

                  const available = quantityAvailable(asset);

                  const lowStock = isLowStock(asset);

                  const canAssign = isAssignable(asset);

                  return (
                    <tr
                      key={asset.id}
                      onClick={() => openViewAsset(asset)}
                      className="cursor-pointer hover:bg-muted"
                    >
                      {/* Checkbox */}

                      <td
                        className="px-3 py-2.5"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border disabled:cursor-not-allowed disabled:opacity-40"
                          checked={selectedIds.has(asset.id)}
                          disabled={!canAssign}
                          onChange={() => toggleSelect(asset)}
                          aria-label={`Select ${asset.name}`}
                        />
                      </td>

                      {/* Image */}

                      <td className="px-4 py-2.5">
                        {asset.imageUrl ? (
                          <img
                            src={asset.imageUrl}
                            alt=""
                            className="h-8 w-8 rounded-md border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                            <Package className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </td>

                      {/* Name */}

                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-foreground">
                        {asset.name}
                      </td>

                      {/* Category */}

                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {asset.category?.name ?? "—"}
                      </td>

                      {/* Quantity */}

                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {quantity > 1 ? (
                          <span
                            className={
                              "inline-flex items-center gap-1 tabular-nums " +
                              (lowStock
                                ? "font-medium text-warning-strong"
                                : "")
                            }
                          >
                            {lowStock && (
                              <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                            {available} / {quantity} available
                          </span>
                        ) : (
                          <span className="tabular-nums text-muted-foreground">
                            {available} / 1
                          </span>
                        )}
                      </td>

                      {/* Assigned To */}

                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {asset.assignments?.[0]?.system
                          ? `System: ${asset.assignments[0].system.systemTag} · ${asset.assignments[0].system.employee?.name ?? "Unassigned"}`
                          : (assignee?.name ?? "—")}
                      </td>

                      {/* Status */}

                      <td className="whitespace-nowrap px-4 py-2.5">
                        <Badge variant={getStatusBadgeVariant(asset.status)}>
                          {formatStatus(asset.status)}
                        </Badge>
                      </td>

                      {/* Condition */}

                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                        {asset.condition}
                      </td>

                      {/* Actions */}

                      <td
                        className="px-4 py-2.5 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}

                              <span className="sr-only">Open actions</span>
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => openViewAsset(asset)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => openEditAsset(asset)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Update
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => openHistory(asset)}
                            >
                              <History className="mr-2 h-4 w-4" />
                              View History
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => openUpdateInventory(asset)}
                            >
                              <PackagePlus className="mr-2 h-4 w-4" />
                              Adjust inventory
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => openInventoryHistory(asset)}
                            >
                              <Boxes className="mr-2 h-4 w-4" />
                              Inventory history
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={isDeleting}
                              onClick={() => void handleDeleteAsset(asset)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} -{" "}
              {Math.min(page * pageSize, total)} of {total} assets
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
                disabled={page >= totalPages || isFetching}
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
        onTransfer={handleTransferFromDrawer}
        onEdit={openEditAsset}
      />

      {/* ======================================================
          CREATE / UPDATE ASSET MODAL
      ====================================================== */}

      <CreateAssetModal
        open={assetModal.open}
        onClose={closeAssetModal}
        asset={assetModal.asset}
        locations={[]}
        vendors={[]}
      />

      {/* ======================================================
          HISTORY MODAL
      ====================================================== */}

      <AssetHistoryModal
        open={historyModal.open}
        asset={historyModal.asset}
        onClose={closeHistory}
      />

      {/* ======================================================
          UPDATE INVENTORY MODAL
      ====================================================== */}

      <UpdateInventoryModal
        open={inventoryModal.open}
        asset={inventoryModal.asset}
        onClose={closeInventoryModal}
      />

      {/* ======================================================
          INVENTORY HISTORY MODAL
      ====================================================== */}

      <InventoryHistoryModal
        open={inventoryHistoryModal.open}
        asset={inventoryHistoryModal.asset}
        onClose={closeInventoryHistory}
      />

      {/* ======================================================
          ASSIGN TO SYSTEM MODAL
      ====================================================== */}

      {assignToSystemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <h2 className="text-base font-semibold text-foreground">
              Assign {selectedIds.size} asset
              {selectedIds.size === 1 ? "" : "s"} to a system
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Only assets with available quantity will be assigned.
            </p>

            <div className="mt-4">
              <Select
                value={selectedSystemId || undefined}
                onValueChange={setSelectedSystemId}
                disabled={isSystemsLoading || isAssigning}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isSystemsLoading ? "Loading systems..." : "Select system"
                    }
                  />
                </SelectTrigger>

                <SelectContent>
                  {systems.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No systems found
                    </SelectItem>
                  ) : (
                    systems.map((sys) => (
                      <SelectItem key={sys.id} value={sys.id}>
                        {sys.systemTag}
                        {sys.name ? ` · ${sys.name}` : ""}
                        {sys.employee?.name ? ` · ${sys.employee.name}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setAssignToSystemModal(false);
                  setSelectedSystemId("");
                }}
                disabled={isAssigning}
              >
                Cancel
              </Button>

              <Button
                onClick={() => void handleBulkAssignToSystem()}
                disabled={!selectedSystemId || isAssigning}
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning…
                  </>
                ) : (
                  "Assign"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
