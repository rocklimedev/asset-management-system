
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

import { useEmployees, useTransferAsset } from "../lib/hooks";
import { useToastStore } from "../components/ui/Toast";

import { EmployeeCard } from "../components/asset-manager/EmployeeCard";
import { AssetChip } from "../components/asset-manager/AssetChip";
import { TransferModal } from "../components/asset-manager/TransferModal";
import { AssetDetailDrawer } from "../components/asset-manager/AssetDetailDrawer";

import {
  SkeletonCard,
  EmptyState,
} from "../components/ui/EmptyState";

import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";

import { apiErrorMessage } from "../lib/api";

import type { Asset, Employee } from "../types";

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

  // ============================================================
  // API
  // ============================================================

  const {
    data,
    isLoading,
    isFetching,
  } = useEmployees({
    search: search || undefined,
    departmentId: department
      ? Number(department)
      : undefined,
  });

  const transferMutation = useTransferAsset();

  const pushToast = useToastStore((state) => state.push);

  const employees = data?.items ?? [];

  // ============================================================
  // DND
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
    return new Map<number, Employee>(
      employees.map((employee) => [
        employee.id,
        employee,
      ]),
    );
  }, [employees]);

  // ============================================================
  // DRAG START
  // ============================================================

  function handleDragStart(event: DragStartEvent) {
    const asset = event.active.data.current?.asset as
      | Asset
      | undefined;

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

    const asset = active.data.current?.asset as
      | Asset
      | undefined;

    const targetEmployee = over.data.current?.employee as
      | Employee
      | undefined;

    if (!asset || !targetEmployee) {
      return;
    }

    // ----------------------------------------------------------
    // Current owner
    // ----------------------------------------------------------

    const currentAssignment = asset.assignments?.find(
      (assignment) => assignment.status === "ACTIVE",
    );

    const fromEmployeeId =
      currentAssignment?.employeeId ?? null;

    // ----------------------------------------------------------
    // Same employee = no-op
    // ----------------------------------------------------------

    if (fromEmployeeId === targetEmployee.id) {
      return;
    }

    // ----------------------------------------------------------
    // Backend transfer rule
    // ----------------------------------------------------------

    if (asset.status !== "ASSIGNED") {
      const statusLabel =
        asset.status.charAt(0) +
        asset.status.slice(1).toLowerCase();

      pushToast(
        `${statusLabel} assets cannot be transferred.`,
        "error",
      );

      return;
    }

    // ----------------------------------------------------------
    // Destination employee validation
    // ----------------------------------------------------------

    if (targetEmployee.status === "EXITED") {
      pushToast(
        "Cannot transfer an asset to an employee who has exited.",
        "error",
      );

      return;
    }

    // ----------------------------------------------------------
    // Source employee
    // ----------------------------------------------------------

    const fromEmployee = fromEmployeeId
      ? employeeById.get(fromEmployeeId) ?? null
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

  function confirmTransfer(
    reason: string,
    notes: string,
  ) {
    if (!pendingTransfer) {
      return;
    }

    if (!pendingTransfer.to) {
      pushToast(
        "Please select a destination employee.",
        "error",
      );

      return;
    }

    const { asset, to } = pendingTransfer;

    transferMutation.mutate(
      {
        assetId: asset.id,
        toEmployeeId: to.id,
        reason,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          pushToast(
            `${asset.name} transferred to ${to.name}.`,
            "success",
          );

          setPendingTransfer(null);
        },

        onError: (error) => {
          pushToast(
            apiErrorMessage(
              error,
              "Transfer failed. The asset remains with its previous owner.",
            ),
            "error",
          );
        },
      },
    );
  }

  // ============================================================
  // OPEN MANUAL TRANSFER
  // ============================================================

  function handleManualTransfer(asset: Asset) {
    const currentAssignment = asset.assignments?.find(
      (assignment) => assignment.status === "ACTIVE",
    );

    const fromEmployeeId =
      currentAssignment?.employeeId ?? null;

    const fromEmployee = fromEmployeeId
      ? employeeById.get(fromEmployeeId) ?? null
      : null;

    if (asset.status !== "ASSIGNED") {
      const statusLabel =
        asset.status.charAt(0) +
        asset.status.slice(1).toLowerCase();

      pushToast(
        `${statusLabel} assets cannot be transferred.`,
        "error",
      );

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
  // RENDER
  // ============================================================

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* ========================================================
          HEADER
      ======================================================== */}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Asset Manager
          </h1>

          <p className="text-sm text-slate-500">
            Drag an assigned asset onto another employee to transfer it.
          </p>
        </div>

        <Button className="w-fit">
          <Plus className="h-4 w-4" />
          Add Asset
        </Button>
      </div>

      {/* ========================================================
          FILTERS
      ======================================================== */}

      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <Input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search employees or assets..."
            className="pl-9"
          />
        </div>

        {/* Keep this only if your useEmployees hook supports
            departmentId. Populate it from your departments API. */}
        <select
          value={department}
          onChange={(event) =>
            setDepartment(event.target.value)
          }
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 sm:w-48"
        >
          <option value="">
            All departments
          </option>

          {/* Department options should come from your
              departments endpoint. */}
        </select>
      </div>

      {/* ========================================================
          EMPLOYEE BOARD
      ======================================================== */}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
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
                activeAssetId={
                  activeAsset?.id ?? null
                }
                onOpenDetail={setDetailAsset}
                onTransferClick={handleManualTransfer}
              />
            ))}
          </div>
        )}

        {/* ======================================================
            DRAG OVERLAY
        ====================================================== */}

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

      {/* ========================================================
          TRANSFER MODAL
      ======================================================== */}

      <TransferModal
        open={Boolean(pendingTransfer)}
        onClose={() => {
          if (!transferMutation.isPending) {
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
                  employee.id !==
                  pendingTransfer.from?.id,
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
              to:
                employeeById.get(employeeId) ??
                null,
            };
          });
        }}
        onConfirm={confirmTransfer}
        loading={transferMutation.isPending}
      />

      {/* ========================================================
          ASSET DETAILS
      ======================================================== */}

      <AssetDetailDrawer
        asset={detailAsset}
        onClose={() => setDetailAsset(null)}
        onTransfer={handleManualTransfer}
      />
    </div>
  );
}

