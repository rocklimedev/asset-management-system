import { useMemo, useState } from "react";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { Laptop, Plus, Search } from "lucide-react";

import { useGetEmployeesQuery } from "../services/api/employees.api";
import {
  useTransferAssetMutation,
  useReleaseAssetsForEmployeeMutation,
} from "../services/api/asset.api";

import { toast } from "../components/ui/toast";

import { EmployeeCard } from "../components/asset-manager/EmployeeCard";
import { AssetChip } from "../components/asset-manager/AssetChip";
import { TransferModal } from "../components/asset-manager/TransferModal";
import { AssetDetailDrawer } from "../components/asset-manager/AssetDetailDrawer";
import { CreateAssetModal } from "../components/asset-manager/CreateAssetModal";
import { AssetPool } from "../components/asset-manager/AssetPool";

import { SkeletonCard, EmptyState } from "../components/ui/EmptyState";

import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

import type { Asset } from "../services/api/asset.api";
import type { Employee } from "../services/api/employees.api";

// ============================================================
// TYPES
// ============================================================

interface ApiError {
  data?: {
    message?: string;
    error?: string;
  };
  message?: string;
}

// ============================================================
// HELPERS
// ============================================================

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) {
    return fallback;
  }

  const apiError = error as ApiError;

  return (
    apiError.data?.message ||
    apiError.data?.error ||
    apiError.message ||
    fallback
  );
}

// ============================================================
// COMPONENT
// ============================================================

export default function AssetManager() {
  // ============================================================
  // STATE
  // ============================================================

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");

  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);

  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  const [pendingTransfer, setPendingTransfer] = useState<{
    asset: Asset;
    from: Employee | null;
    to: Employee | null;
    pickMode: boolean;
  } | null>(null);

  // ------------------------------------------------------------
  // Asset pool
  // ------------------------------------------------------------

  const [poolTarget, setPoolTarget] = useState<Employee | null>(null);

  // ------------------------------------------------------------
  // Create / Edit asset modal
  // ------------------------------------------------------------

  const [assetModal, setAssetModal] = useState<{
    open: boolean;
    asset: Asset | null;
  }>({
    open: false,
    asset: null,
  });

  // ============================================================
  // API - EMPLOYEES
  // ============================================================

  const { data, isLoading, isFetching } = useGetEmployeesQuery({
    search: search || undefined,
    departmentId: department ? department : undefined,
  });

  // ============================================================
  // API - TRANSFER
  // ============================================================

  const [transferAsset, { isLoading: isTransferLoading }] =
    useTransferAssetMutation();

  // ============================================================
  // API - RELEASE ASSETS
  // ============================================================

  const [releaseAssetsForEmployee, { isLoading: isReleasing }] =
    useReleaseAssetsForEmployeeMutation();

  // ============================================================
  // NORMALIZE EMPLOYEE RESPONSE
  // ============================================================

  const employees = Array.isArray(data)
    ? data
    : ((data as { data?: Employee[]; items?: Employee[] } | undefined)?.data ??
      (data as { items?: Employee[] } | undefined)?.items ??
      []);

  // ============================================================
  // DND SENSORS
  // ============================================================

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),

    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    }),
  );

  // ============================================================
  // EMPLOYEE LOOKUP
  // ============================================================

  const employeeById = useMemo(() => {
    return new Map<string, Employee>(
      employees.map((employee) => [String(employee.id), employee]),
    );
  }, [employees]);

  // ============================================================
  // DRAG START
  // ============================================================

  function handleDragStart(event: DragStartEvent) {
    const asset = event.active.data.current?.asset as Asset | undefined;

    if (!asset) {
      return;
    }

    setActiveAsset(asset);
  }

  // ============================================================
  // DRAG END
  // ============================================================

  function handleDragEnd(event: DragEndEvent) {
    setActiveAsset(null);

    const { active, over } = event;

    if (!over) {
      return;
    }

    const asset = active.data.current?.asset as Asset | undefined;

    const targetEmployee = over.data.current?.employee as Employee | undefined;

    if (!asset || !targetEmployee) {
      return;
    }

    // ----------------------------------------------------------
    // Current owner
    // ----------------------------------------------------------

    const currentAssignment = asset.assignments?.find(
      (assignment) => assignment.status === "ACTIVE",
    );

    const fromEmployeeId = currentAssignment?.employeeId ?? null;

    // ----------------------------------------------------------
    // Same employee = no-op
    // ----------------------------------------------------------

    if (
      fromEmployeeId !== null &&
      String(fromEmployeeId) === String(targetEmployee.id)
    ) {
      return;
    }

    // ----------------------------------------------------------
    // Backend transfer rule
    // ----------------------------------------------------------

    if (asset.status !== "ASSIGNED") {
      const statusLabel =
        asset.status.charAt(0) + asset.status.slice(1).toLowerCase();

      toast.add({
        type: "error",
        title: "Transfer unavailable",
        description: `${statusLabel} assets cannot be transferred.`,
      });

      return;
    }

    // ----------------------------------------------------------
    // Destination employee validation
    // ----------------------------------------------------------

    if (targetEmployee.status === "EXITED") {
      toast.add({
        type: "error",
        title: "Transfer unavailable",
        description: "Cannot transfer an asset to an employee who has exited.",
      });

      return;
    }

    // ----------------------------------------------------------
    // Source employee
    // ----------------------------------------------------------

    const fromEmployee = fromEmployeeId
      ? (employeeById.get(String(fromEmployeeId)) ?? null)
      : null;

    // ----------------------------------------------------------
    // Open transfer confirmation
    // ----------------------------------------------------------

    setPendingTransfer({
      asset,
      from: fromEmployee,
      to: targetEmployee,
      pickMode: false,
    });
  }

  // ============================================================
  // CONFIRM TRANSFER
  // ============================================================

  async function confirmTransfer(reason: string, notes: string) {
    if (!pendingTransfer) {
      return;
    }

    if (!pendingTransfer.to) {
      toast.add({
        type: "error",
        title: "Employee required",
        description: "Please select a destination employee.",
      });

      return;
    }

    const { asset, to } = pendingTransfer;

    try {
      await transferAsset({
        id: String(asset.id),
        toEmployeeId: String(to.id),
        reason,
        notes: notes || undefined,
      }).unwrap();

      toast.add({
        type: "success",
        title: "Asset transferred",
        description: `${asset.name} transferred to ${to.name}.`,
      });

      setPendingTransfer(null);
    } catch (error) {
      toast.add({
        type: "error",
        title: "Transfer failed",
        description: getErrorMessage(
          error,
          "Transfer failed. The asset remains with its previous owner.",
        ),
      });
    }
  }

  // ============================================================
  // OPEN MANUAL TRANSFER
  // ============================================================

  function handleManualTransfer(asset: Asset) {
    const currentAssignment = asset.assignments?.find(
      (assignment) => assignment.status === "ACTIVE",
    );

    const fromEmployeeId = currentAssignment?.employeeId ?? null;

    const fromEmployee = fromEmployeeId
      ? (employeeById.get(String(fromEmployeeId)) ?? null)
      : null;

    // ----------------------------------------------------------
    // Validate asset status
    // ----------------------------------------------------------

    if (asset.status !== "ASSIGNED") {
      const statusLabel =
        asset.status.charAt(0) + asset.status.slice(1).toLowerCase();

      toast.add({
        type: "error",
        title: "Transfer unavailable",
        description: `${statusLabel} assets cannot be transferred.`,
      });

      return;
    }

    setDetailAsset(null);

    setPendingTransfer({
      asset,
      from: fromEmployee,
      to: null,
      pickMode: true,
    });
  }

  // ============================================================
  // OPEN ASSET POOL
  // ============================================================

  function handleAssignFromPool(employee: Employee) {
    setDetailAsset(null);
    setPoolTarget(employee);
  }

  // ============================================================
  // RELEASE ASSETS FOR AN EXITED EMPLOYEE
  // ============================================================

  async function handleReleaseAssets(employee: Employee) {
    const hasActiveAssets = Boolean(
      employee.assignments?.some(
        (assignment) => assignment.status === "ACTIVE",
      ),
    );

    if (!hasActiveAssets) {
      toast.add({
        type: "info",
        title: "No assets to release",
        description: `${employee.name} has no assets to release.`,
      });

      return;
    }

    const confirmed = window.confirm(
      `Return every asset currently assigned to ${employee.name}? This can't be undone.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const result = await releaseAssetsForEmployee(
        String(employee.id),
      ).unwrap();

      toast.add({
        type: "success",
        title: "Assets released",
        description: `${result.releasedCount} asset${
          result.releasedCount === 1 ? "" : "s"
        } returned from ${employee.name}.`,
      });
    } catch (error) {
      toast.add({
        type: "error",
        title: "Release failed",
        description: getErrorMessage(
          error,
          "Could not release this employee's assets. Please try again.",
        ),
      });
    }
  }

  // ============================================================
  // CREATE ASSET
  // ============================================================

  function openCreateAsset() {
    setAssetModal({
      open: true,
      asset: null,
    });
  }

  // ============================================================
  // EDIT ASSET
  // ============================================================

  function openEditAsset(asset: Asset) {
    setDetailAsset(null);

    setAssetModal({
      open: true,
      asset,
    });
  }

  // ============================================================
  // CLOSE ASSET MODAL
  // ============================================================

  function closeAssetModal() {
    setAssetModal({
      open: false,
      asset: null,
    });
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
          <h1 className="text-lg font-semibold text-foreground">
            Asset Manager
          </h1>

          <p className="text-sm text-muted-foreground">
            Drag an assigned asset onto another employee to transfer it, or
            assign a new one from the pool.
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

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        {/* Search */}

        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search employees or assets..."
            className="pl-9"
          />
        </div>

        {/* Department */}

        <select
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-ring sm:w-48"
        >
          <option value="">All departments</option>
        </select>
      </div>

      {/* ======================================================
          EMPLOYEE BOARD
      ====================================================== */}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({
              length: 8,
            }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            icon={Laptop}
            title="No employees found"
            description="Try a different search or add a new employee to get started."
          />
        ) : (
          <div
            className={
              "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 " +
              (isFetching ? "opacity-70" : "")
            }
          >
            {employees.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                activeAssetId={activeAsset?.id ? String(activeAsset.id) : null}
                onOpenDetail={setDetailAsset}
                onTransferClick={handleManualTransfer}
                onAssignClick={handleAssignFromPool}
                onReleaseClick={handleReleaseAssets}
                releasingAssets={isReleasing}
              />
            ))}
          </div>
        )}

        {/* ====================================================
            DRAG OVERLAY
        ==================================================== */}

        <DragOverlay>
          {activeAsset ? (
            <div className="w-56 rotate-2 shadow-xl">
              <AssetChip
                asset={activeAsset}
                onOpenDetail={() => {}}
                transferrable
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ======================================================
          TRANSFER MODAL
      ====================================================== */}

      <TransferModal
        open={Boolean(pendingTransfer)}
        onClose={() => {
          if (!isTransferLoading) {
            setPendingTransfer(null);
          }
        }}
        asset={pendingTransfer?.asset ?? null}
        fromEmployee={pendingTransfer?.from ?? null}
        toEmployee={pendingTransfer?.to ?? null}
        employeeOptions={
          pendingTransfer?.pickMode
            ? employees.filter(
                (employee) =>
                  String(employee.id) !== String(pendingTransfer.from?.id),
              )
            : undefined
        }
        onSelectEmployee={(employeeId) => {
          setPendingTransfer((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              to: employeeById.get(String(employeeId)) ?? null,
            };
          });
        }}
        onConfirm={confirmTransfer}
        loading={isTransferLoading}
      />

      {/* ======================================================
          ASSET POOL
      ====================================================== */}

      <AssetPool
        open={Boolean(poolTarget)}
        employee={poolTarget}
        onClose={() => setPoolTarget(null)}
      />

      {/* ======================================================
          ASSET DETAILS
      ====================================================== */}

      <AssetDetailDrawer
        asset={detailAsset}
        onClose={() => setDetailAsset(null)}
        onTransfer={handleManualTransfer}
        onEdit={openEditAsset}
      />

      {/* ======================================================
          CREATE / EDIT ASSET MODAL
      ====================================================== */}

      <CreateAssetModal
        open={assetModal.open}
        onClose={closeAssetModal}
        asset={assetModal.asset}
        locations={[]}
        vendors={[]}
      />
    </div>
  );
}
