import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

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

import {
  AppWindow,
  Building2,
  Laptop,
  Monitor,
  Package,
  Plus,
  Search,
  Users,
} from "lucide-react";

import {
  useGetEmployeesQuery,
  useGetOrganisationsQuery,
} from "../services/api/employees.api";

import {
  useTransferAssetMutation,
  useReleaseAssetsForEmployeeMutation,
  useReturnAssetMutation,
  useAssignSystemMutation,
  useReturnSystemMutation,
  useGetSystemsQuery,
  useDeleteSystemMutation,
  type Asset,
  type SystemRecord,
} from "../services/api/asset.api";

import { useConfirm } from "../components/ui/confirm-dialog";
import { SystemDetailDrawer } from "../components/systems/SystemDetailDrawer";
import { CreateUpdateSystemModal } from "../components/systems/CreateUpdateSystemModal";
import { AssignSystemModal } from "../components/systems/AssignSystemModal";
import { AssetHistoryModal } from "../components/asset-manager/AssetHistoryModal";
import {
  apiErrorMessage,
  type OrganisationInfo,
  type SystemWithOrganisation,
} from "../types/systems";

import { toast } from "../components/ui/toast";

import { PersonRow, initials } from "../components/asset-manager/PersonRow";
import { AssignmentRow } from "../components/asset-manager/AssignmentRow";
import { TransferModal } from "../components/asset-manager/TransferModal";
import { TransferSystemModal } from "../components/asset-manager/TransferSystemModal";
import { AssetDetailDrawer } from "../components/asset-manager/AssetDetailDrawer";
import { CreateAssetModal } from "../components/asset-manager/CreateAssetModal";
import { QuickAddAsset } from "../components/quick/QuickAddAsset";
import { QuickBuildComputer } from "../components/quick/QuickBuildComputer";
import { AssetPool } from "../components/asset-manager/AssetPool";
import { SystemPool } from "../components/asset-manager/SystemPool";

import { SkeletonCard, EmptyState } from "../components/ui/EmptyState";

import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";

import type { Employee, Organisation } from "../services/api/employees.api";
import { PageHeader } from "@/components/layout/PageHeader";

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

  const [organisationId, setOrganisationId] = useState("");

  // View ("people" or "computers") and the open computer live in the URL,
  // so links such as /asset-manager?view=computers&system=12 keep working.
  const [params, setParams] = useSearchParams();
  const view: "people" | "computers" =
    params.get("view") === "computers" ? "computers" : "people";
  const selectedSystemId = params.get("system");

  const confirm = useConfirm();
  const [deleteSystem, deleteSystemState] = useDeleteSystemMutation();

  const [editorOpen, setEditorOpen] = useState(false);
  // Simple three-step creators. The full forms stay behind their links.
  const [quickAssetOpen, setQuickAssetOpen] = useState(false);
  const [quickComputerOpen, setQuickComputerOpen] = useState(false);
  const [editingSystem, setEditingSystem] =
    useState<SystemWithOrganisation | null>(null);
  const [assignSystemOpen, setAssignSystemOpen] = useState(false);
  const [computerPoolOpen, setComputerPoolOpen] = useState(false);
  const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);

  // The person whose equipment is open on the right.
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [activeAsset, setActiveAsset] = useState<Asset | null>(null);

  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);

  const [pendingTransfer, setPendingTransfer] = useState<{
    asset: Asset;
    from: Employee | null;
    to: Employee | null;
    pickMode: boolean;
  } | null>(null);

  // ============================================================
  // ASSET POOL
  // ============================================================

  const [poolTarget, setPoolTarget] = useState<Employee | null>(null);

  // ============================================================
  // SYSTEM POOL (assign first system)
  // ============================================================

  const [systemPoolTarget, setSystemPoolTarget] = useState<Employee | null>(
    null,
  );

  // ============================================================
  // SYSTEM TRANSFER (employee already has a system)
  // ============================================================

  const [systemTransfer, setSystemTransfer] = useState<{
    system: SystemRecord;
    from: Employee;
    to: Employee | null;
  } | null>(null);

  // ============================================================
  // CREATE / EDIT ASSET MODAL
  // ============================================================

  const [assetModal, setAssetModal] = useState<{
    open: boolean;
    asset: Asset | null;
  }>({
    open: false,
    asset: null,
  });

  // ============================================================
  // API - ORGANISATIONS
  // ============================================================

  const { data: organisationsData, isLoading: isOrganisationsLoading } =
    useGetOrganisationsQuery();

  // ============================================================
  // NORMALIZE ORGANISATIONS
  // ============================================================

  const organisations: Organisation[] = Array.isArray(organisationsData)
    ? organisationsData
    : (organisationsData?.items ?? []);

  // ============================================================
  // API - EMPLOYEES
  // ============================================================

  const {
    data: employeesData,
    isLoading,
    isFetching,
  } = useGetEmployeesQuery({
    search: search.trim() || undefined,
    organisationId: organisationId || undefined,
  });

  // ============================================================
  // NORMALIZE EMPLOYEES
  // ============================================================

  const employees: Employee[] = Array.isArray(employeesData)
    ? employeesData
    : (employeesData?.items ?? []);

  // ============================================================
  // API - COMPUTERS (systems built from parts)
  // ============================================================

  const {
    data: systemsData = [],
    isLoading: isSystemsLoading,
    isError: isSystemsError,
    refetch: refetchSystems,
  } = useGetSystemsQuery();

  const systems = systemsData as SystemWithOrganisation[];

  const selectedSystem =
    systems.find((system) => String(system.id) === selectedSystemId) ?? null;

  const systemOrganisations: OrganisationInfo[] = organisations.map((o) => ({
    id: o.id,
    name: o.name,
  }));

  const visibleSystems = systems
    .filter((system) => {
      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        `${system.name} ${system.systemTag} ${system.category?.name ?? ""} ${system.employee?.name ?? ""} ${
          system.organisation?.name ?? ""
        }`
          .toLowerCase()
          .includes(query);

      const matchesOrganisation =
        !organisationId || String(system.organisationId) === organisationId;

      return matchesSearch && matchesOrganisation;
    })
    // Unassigned computers first: those are the ones still waiting for someone.
    .sort(
      (a, b) => Number(Boolean(a.employeeId)) - Number(Boolean(b.employeeId)),
    );

  // ============================================================
  // API - TRANSFER ASSET
  // ============================================================

  const [transferAsset, { isLoading: isTransferLoading }] =
    useTransferAssetMutation();

  // ============================================================
  // API - ASSIGN / TRANSFER SYSTEM
  // ============================================================

  const [assignSystem, { isLoading: isAssigningSystem }] =
    useAssignSystemMutation();
  const [returnSystem, { isLoading: isReturningSystem }] = useReturnSystemMutation();

  // ============================================================
  // API - RELEASE ASSETS
  // ============================================================

  const [releaseAssetsForEmployee, { isLoading: isReleasing }] =
    useReleaseAssetsForEmployeeMutation();

  // ============================================================
  // API - RETURN / UNASSIGN
  // ============================================================

  const [returnAsset, { isLoading: isReturning }] = useReturnAssetMutation();

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

    const currentAssignment = asset.assignments?.find(
      (assignment) => assignment.status === "ACTIVE",
    );

    const fromEmployeeId = currentAssignment?.employeeId ?? null;

    if (
      fromEmployeeId !== null &&
      String(fromEmployeeId) === String(targetEmployee.id)
    ) {
      return;
    }

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

    if (targetEmployee.status === "EXITED") {
      toast.add({
        type: "error",
        title: "Transfer unavailable",
        description: "Cannot transfer an asset to an employee who has exited.",
      });

      return;
    }

    const fromEmployee = fromEmployeeId
      ? (employeeById.get(String(fromEmployeeId)) ?? null)
      : null;

    setPendingTransfer({
      asset,
      from: fromEmployee,
      to: targetEmployee,
      pickMode: false,
    });
  }

  // ============================================================
  // CONFIRM ASSET TRANSFER
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
  // CONFIRM SYSTEM TRANSFER
  // ============================================================

  async function confirmSystemTransfer(employeeId: string, _notes?: string) {
    if (!systemTransfer) {
      return;
    }

    try {
      await assignSystem({
        id: systemTransfer.system.id,
        employeeId,
      }).unwrap();

      const toName =
        employees.find((e) => String(e.id) === String(employeeId))?.name ??
        "employee";

      toast.add({
        type: "success",
        title: "System transferred",
        description: `${systemTransfer.system.name} transferred to ${toName}.`,
      });

      setSystemTransfer(null);
    } catch (error) {
      toast.add({
        type: "error",
        title: "Transfer failed",
        description: getErrorMessage(
          error,
          "Could not transfer this system. Please try again.",
        ),
      });
    }
  }

  // ============================================================
  // RETURN DESTINATION'S EXISTING SYSTEM(S), THEN ASSIGN
  // ============================================================

  async function handleReturnExistingSystem(employee: Employee) {
    const systems = employee.systems ?? [];

    if (!systems.length) {
      return;
    }

    try {
      for (const sys of systems) {
        await returnSystem(sys.id).unwrap();
      }

      toast.add({
        type: "success",
        title: "Computer taken back",
        description: `${employee.name}'s computer${
          systems.length > 1 ? "s were" : " was"
        } back in stock.`,
      });
    } catch (error) {
      toast.add({
        type: "error",
        title: "Return failed",
        description: getErrorMessage(
          error,
          "Could not return the existing system. Please try again.",
        ),
      });
      throw error;
    }
  }

  // ============================================================
  // OPEN MANUAL ASSET TRANSFER
  // ============================================================

  function handleManualTransfer(asset: Asset) {
    const currentAssignment = asset.assignments?.find(
      (assignment) => assignment.status === "ACTIVE",
    );

    const fromEmployeeId = currentAssignment?.employeeId ?? null;

    const fromEmployee = fromEmployeeId
      ? (employeeById.get(String(fromEmployeeId)) ?? null)
      : null;

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
  // UNASSIGN / RETURN ASSET
  // ============================================================

  async function handleUnassign(asset: Asset) {
    if (asset.status !== "ASSIGNED") {
      toast.add({
        type: "error",
        title: "Cannot unassign",
        description: "Only equipment that someone holds can be taken back.",
      });
      return;
    }

    const confirmed = window.confirm(
      `Take "${asset.name}" back to stock? It will no longer be with its current holder.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await returnAsset({
        id: String(asset.id),
        notes: undefined,
      }).unwrap();

      toast.add({
        type: "success",
        title: "Asset unassigned",
        description: `${asset.name} is back in stock.`,
      });

      setDetailAsset(null);
    } catch (error) {
      toast.add({
        type: "error",
        title: "Couldn't take it back",
        description: getErrorMessage(
          error,
          "Could not return this asset. Please try again.",
        ),
      });
    }
  }

  // ============================================================
  // OPEN ASSET POOL
  // ============================================================

  function handleAssignFromPool(employee: Employee) {
    setDetailAsset(null);
    setPoolTarget(employee);
  }

  // ============================================================
  // SYSTEM BUTTON
  // - no system  → SystemPool (assign first system)
  // - has system → TransferSystemModal (transfer existing)
  // ============================================================

  function handleAssignSystemFromPool(employee: Employee) {
    const systems = employee.systems ?? [];

    setDetailAsset(null);

    if (systems.length > 0) {
      setSystemTransfer({
        system: systems[0],
        from: employee,
        to: null,
      });
      return;
    }

    setSystemPoolTarget(employee);
  }

  // ============================================================
  // RELEASE ASSETS FOR EXITED EMPLOYEE
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
      `Take back everything ${employee.name} has? All of it goes back to stock. This can't be undone.`,
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
  // SELECTED PERSON
  // Falls back to the first person so the right panel is never
  // empty while the list has people in it.
  // ============================================================

  const selectedEmployee: Employee | null =
    employees.find((employee) => String(employee.id) === selectedEmployeeId) ??
    employees[0] ??
    null;

  const selectedAssignments = selectedEmployee?.assignments ?? [];
  const selectedHardware = selectedAssignments.filter(
    (assignment) => assignment.asset?.kind === "HARDWARE",
  );
  const selectedSoftware = selectedAssignments.filter(
    (assignment) => assignment.asset?.kind === "SOFTWARE",
  );
  const selectedSystems = selectedEmployee?.systems ?? [];
  const selectedHasExited = selectedEmployee?.status === "EXITED";
  const selectedHasActive = selectedAssignments.some(
    (assignment) => assignment.status === "ACTIVE",
  );
  const selectedIsEmpty =
    selectedHardware.length === 0 &&
    selectedSoftware.length === 0 &&
    selectedSystems.length === 0;

  // ============================================================
  // VIEW + COMPUTER NAVIGATION
  // ============================================================

  function setView(next: "people" | "computers") {
    setParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set("view", next);
      if (next === "people") updated.delete("system");
      return updated;
    });
  }

  function openComputer(systemId: string) {
    setParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set("view", "computers");
      updated.set("system", systemId);
      return updated;
    });
  }

  function closeComputer() {
    setParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.delete("system");
      return updated;
    });
  }

  function openCreateComputer() {
    setEditingSystem(null);
    setEditorOpen(true);
  }

  function openEditComputer(system: SystemWithOrganisation) {
    setEditingSystem(system);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditingSystem(null);
  }

  async function deleteComputer(system: SystemWithOrganisation) {
    const confirmed = await confirm({
      title: `Delete ${system.name}?`,
      description: `${system.name} (${system.systemTag}) will be permanently deleted. This cannot be undone.`,
      confirmLabel: "Delete computer build",
      tone: "danger",
    });

    if (!confirmed) return;

    try {
      await deleteSystem(system.id).unwrap();

      setAssignSystemOpen(false);
      setComputerPoolOpen(false);
      setHistoryAsset(null);
      closeComputer();

      toast.add({
        title: "Computer deleted",
        description: `${system.name} has been deleted.`,
        type: "success",
      });
    } catch (error) {
      toast.add({
        title: "Could not delete computer",
        description: apiErrorMessage(error),
        type: "error",
      });
    }
  }

  // ============================================================
  // COMPUTER LIST + DETAIL BODIES (used when view = computers)
  // ============================================================

  const computerListBody = isSystemsLoading ? (
    Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
  ) : isSystemsError ? (
    <div role="alert" className="p-3 text-sm">
      Could not load computers.{" "}
      <Button variant="outline" size="sm" onClick={() => refetchSystems()}>
        Retry
      </Button>
    </div>
  ) : visibleSystems.length === 0 ? (
    <EmptyState
      icon={Monitor}
      title="No computers yet"
      description="Create a desktop PC or mobile phone record, add its assets, then assign it to someone."
    />
  ) : (
    visibleSystems.map((system) => (
      <ComputerRow
        key={system.id}
        system={system}
        selected={String(selectedSystem?.id) === String(system.id)}
        onSelect={() => openComputer(String(system.id))}
      />
    ))
  );

  const computerDetailBody = selectedSystem ? (
    <SystemDetailDrawer
      system={selectedSystem}
      busy={deleteSystemState.isLoading}
      onClose={closeComputer}
      onEdit={openEditComputer}
      onDelete={deleteComputer}
      onOpenAssign={() => setAssignSystemOpen(true)}
      onOpenAssetPool={() => setComputerPoolOpen(true)}
      onShowHistory={setHistoryAsset}
    />
  ) : (
    <div className="p-6">
      <EmptyState
        icon={Monitor}
        title="Select a computer"
        description="Choose a computer from the list to see its parts and assign it to someone."
      />
    </div>
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <PageHeader
        className="mb-6"
        title="Assign assets"
        description="Give equipment from stock to people, or build a computer from parts and give the whole machine to someone."
        actions={
          <>
            <Button variant="outline" onClick={() => setQuickComputerOpen(true)}>
              <Monitor className="h-4 w-4" />
              New computer
            </Button>

            <Button onClick={() => setQuickAssetOpen(true)}>
              <Plus className="h-4 w-4" />
              New asset
            </Button>
          </>
        }
      />

      {/* ======================================================
          HOW IT WORKS
          Three plain steps, always visible, so nobody has to be
          trained before they can use the page.
      ====================================================== */}

      <ol
        aria-label="How this page works"
        className="mb-6 grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card sm:grid-cols-3"
      >
        {[
          ["1", "Pick someone", "Choose a person from the list, or a computer you have built."],
          ["2", "Give them equipment", "Pick a laptop, phone or licence that is in stock, then confirm."],
          ["3", "Take it back when done", "Use Take back to return an item to stock when someone leaves or swaps."],
        ].map(([step, title, body]) => (
          <li key={step} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {step}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* ====================================================
              LEFT — PEOPLE
          ==================================================== */}

          <section
            aria-label="People"
            className="flex flex-col overflow-hidden rounded-xl border border-border bg-card lg:max-h-[calc(100vh-190px)]"
          >
            <div className="space-y-2 border-b border-border p-3">
              <div
                role="tablist"
                aria-label="What to show"
                className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 shadow-inset"
              >
                {(
                  [
                    ["people", "People", employees.length],
                    ["computers", "Computers", systems.length],
                  ] as const
                ).map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={view === value}
                    onClick={() => setView(value)}
                    className={
                      "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                      (view === value
                        ? "bg-card text-primary shadow-card"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {label}
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    view === "computers"
                      ? "Find a computer or person"
                      : "Find a person"
                  }
                  aria-label={view === "computers" ? "Find a computer" : "Find a person"}
                  className="pl-9"
                />
              </div>

              <select
                value={organisationId}
                onChange={(event) => setOrganisationId(event.target.value)}
                disabled={isOrganisationsLoading}
                aria-label="Filter by organisation"
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {isOrganisationsLoading
                    ? "Loading organisations…"
                    : "All organisations"}
                </option>

                {organisations.map((organisation) => (
                  <option key={organisation.id} value={organisation.id}>
                    {organisation.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              className={
                "min-h-0 flex-1 space-y-1 overflow-y-auto p-2 " +
                (isFetching ? "opacity-70" : "")
              }
            >
              {view === "computers" ? (
                computerListBody
              ) : isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonCard key={index} />
                ))
              ) : employees.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No people found"
                  description={
                    organisationId
                      ? "No employees in this organisation yet."
                      : "Try a different search, or add an employee first."
                  }
                />
              ) : (
                employees.map((employee) => (
                  <PersonRow
                    key={employee.id}
                    employee={employee}
                    selected={String(selectedEmployee?.id) === String(employee.id)}
                    onSelect={() => setSelectedEmployeeId(String(employee.id))}
                  />
                ))
              )}
            </div>

            <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
              {view === "computers"
                ? `${visibleSystems.length} ${visibleSystems.length === 1 ? "computer" : "computers"}`
                : `${employees.length} ${employees.length === 1 ? "person" : "people"}`}
            </p>
          </section>

          {/* ====================================================
              RIGHT — SELECTED PERSON'S EQUIPMENT
          ==================================================== */}

          <section
            aria-label="Equipment for selected person"
            className="min-w-0 rounded-xl border border-border bg-card"
          >
            {view === "computers" ? (
              computerDetailBody
            ) : !selectedEmployee ? (
              <div className="p-6">
                <EmptyState
                  icon={Users}
                  title="Select a person"
                  description="Pick someone from the list on the left. Their equipment appears here, and you can give them more."
                />
              </div>
            ) : (
              <>
                {/* ------------------------------------------------
                    Person header + the one primary action
                ------------------------------------------------ */}

                <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                      {initials(selectedEmployee.name)}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-foreground">
                          {selectedEmployee.name}
                        </h2>

                        {selectedHasExited && (
                          <span className="shrink-0 rounded-full bg-destructive-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive-strong">
                            Left
                          </span>
                        )}
                      </div>

                      <p className="truncate text-xs text-muted-foreground">
                        {[
                          selectedEmployee.designation,
                          selectedEmployee.department?.name,
                          selectedEmployee.employeeCode,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "No role set"}
                      </p>
                    </div>
                  </div>

                  {!selectedHasExited ? (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button onClick={() => handleAssignFromPool(selectedEmployee)}>
                        <Package className="h-4 w-4" />
                        Give equipment
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleAssignSystemFromPool(selectedEmployee)}
                      >
                        <Monitor className="h-4 w-4" />
                        {selectedSystems.length > 0
                          ? "Change computer"
                          : "Give a computer"}
                      </Button>
                    </div>
                  ) : (
                    selectedHasActive && (
                      <Button
                        variant="outline"
                        disabled={isReleasing}
                        onClick={() => handleReleaseAssets(selectedEmployee)}
                      >
                        {isReleasing ? "Taking back…" : "Take back everything"}
                      </Button>
                    )
                  )}
                </div>

                {/* ------------------------------------------------
                    Simple counts, no icons to decode
                ------------------------------------------------ */}

                <dl className="grid grid-cols-3 divide-x divide-border border-b border-border">
                  {[
                    { label: "Computer", value: selectedSystems.length },
                    { label: "Hardware", value: selectedHardware.length },
                    { label: "Software", value: selectedSoftware.length },
                  ].map((stat) => (
                    <div key={stat.label} className="px-5 py-3">
                      <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                      <dd className="text-lg font-semibold tabular-nums text-foreground">
                        {stat.value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* ------------------------------------------------
                    Equipment
                ------------------------------------------------ */}

                <div className="p-5">
                  {selectedIsEmpty ? (
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-10 text-center">
                      <Package className="h-6 w-6 text-muted-foreground" />

                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Nothing assigned yet
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {selectedHasExited
                            ? "This person has left and holds no equipment."
                            : "Give them a laptop, phone or software licence from stock."}
                        </p>
                      </div>

                      {!selectedHasExited && (
                        <Button onClick={() => handleAssignFromPool(selectedEmployee)}>
                          <Plus className="h-4 w-4" />
                          Give equipment
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Computer */}
                      {selectedSystems.length > 0 && (
                        <EquipmentGroup
                          title="Computer"
                          icon={Monitor}
                          count={selectedSystems.length}
                        >
                          {selectedSystems.map((system) => (
                            <li
                              key={system.id}
                              className="flex items-center gap-3 py-3"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                                <Monitor className="h-4 w-4" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {system.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {system.systemTag} · {system.category?.name ?? "Category not set"}
                                  {system.assignments?.length
                                    ? ` · ${system.assignments.length} parts`
                                    : ""}
                                </p>
                              </div>

                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openComputer(String(system.id))}
                                  className="inline-flex h-8 items-center rounded-md px-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                  View
                                </button>
                              </div>
                            </li>
                          ))}
                        </EquipmentGroup>
                      )}

                      {/* Hardware */}
                      {selectedHardware.length > 0 && (
                        <EquipmentGroup
                          title="Hardware"
                          icon={Laptop}
                          count={selectedHardware.length}
                          hint={
                            selectedHasExited
                              ? undefined
                              : "Move an item to someone else, or drag it onto them in the list."
                          }
                        >
                          {selectedHardware.map(
                            (assignment) =>
                              assignment.asset && (
                                <AssignmentRow
                                  key={assignment.id}
                                  asset={assignment.asset}
                                  draggable={
                                    !selectedHasExited &&
                                    assignment.asset.status === "ASSIGNED"
                                  }
                                  onOpenDetails={setDetailAsset}
                                  onMove={handleManualTransfer}
                                  onReturn={handleUnassign}
                                  returning={isReturning}
                                />
                              ),
                          )}
                        </EquipmentGroup>
                      )}

                      {/* Software */}
                      {selectedSoftware.length > 0 && (
                        <EquipmentGroup
                          title="Software"
                          icon={AppWindow}
                          count={selectedSoftware.length}
                        >
                          {selectedSoftware.map(
                            (assignment) =>
                              assignment.asset && (
                                <AssignmentRow
                                  key={assignment.id}
                                  asset={assignment.asset}
                                  draggable={false}
                                  onOpenDetails={setDetailAsset}
                                  onReturn={handleUnassign}
                                  returning={isReturning}
                                />
                              ),
                          )}
                        </EquipmentGroup>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>

        <DragOverlay>
          {activeAsset ? (
            <div className="flex w-64 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-overlay">
              <Laptop className="h-4 w-4 text-muted-foreground" />
              <span className="truncate text-sm font-medium">{activeAsset.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ======================================================
          MODALS AND DRAWERS (unchanged behaviour)
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

      <TransferSystemModal
        open={Boolean(systemTransfer)}
        onClose={() => {
          if (!isAssigningSystem && !isReturningSystem) {
            setSystemTransfer(null);
          }
        }}
        system={systemTransfer?.system ?? null}
        fromEmployee={systemTransfer?.from ?? null}
        toEmployee={systemTransfer?.to ?? null}
        employeeOptions={employees.filter(
          (e) =>
            e.status !== "EXITED" &&
            String(e.id) !== String(systemTransfer?.from.id),
        )}
        onSelectEmployee={(id) =>
          setSystemTransfer((cur) =>
            cur
              ? {
                  ...cur,
                  to: employeeById.get(String(id)) ?? null,
                }
              : cur,
          )
        }
        onConfirm={confirmSystemTransfer}
        onReturnExistingSystem={handleReturnExistingSystem}
        loading={isAssigningSystem || isReturningSystem}
        allowReplace={true}
      />

      <AssetPool
        open={Boolean(poolTarget)}
        employee={poolTarget}
        onClose={() => setPoolTarget(null)}
      />

      <SystemPool
        open={Boolean(systemPoolTarget)}
        employee={systemPoolTarget}
        onClose={() => setSystemPoolTarget(null)}
      />

      <AssetDetailDrawer
        asset={detailAsset}
        onClose={() => setDetailAsset(null)}
        onTransfer={handleManualTransfer}
        onEdit={openEditAsset}
        onUnassign={handleUnassign}
      />

      <CreateUpdateSystemModal
        open={editorOpen}
        system={editingSystem}
        organisations={systemOrganisations}
        onClose={closeEditor}
        onSaved={(systemId) => {
          closeEditor();
          openComputer(String(systemId));
        }}
      />

      <AssignSystemModal
        open={assignSystemOpen}
        system={selectedSystem}
        onClose={() => setAssignSystemOpen(false)}
        onAssigned={() => setAssignSystemOpen(false)}
      />

      <AssetPool
        open={computerPoolOpen && Boolean(selectedSystem)}
        system={selectedSystem}
        onClose={() => setComputerPoolOpen(false)}
      />

      <AssetHistoryModal
        open={Boolean(historyAsset)}
        asset={historyAsset}
        onClose={() => setHistoryAsset(null)}
      />

      <QuickAddAsset
        open={quickAssetOpen}
        onClose={() => setQuickAssetOpen(false)}
        onOpenFullForm={() => {
          setQuickAssetOpen(false);
          openCreateAsset();
        }}
      />

      <QuickBuildComputer
        open={quickComputerOpen}
        onClose={() => setQuickComputerOpen(false)}
        onOpenFullForm={() => {
          setQuickComputerOpen(false);
          openCreateComputer();
        }}
      />

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

// ============================================================
// EQUIPMENT GROUP
// A titled block with a count and an optional one-line hint.
// ============================================================

function EquipmentGroup({
  title,
  icon: Icon,
  count,
  hint,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
          <span className="text-xs font-normal tabular-nums text-muted-foreground">
            {count}
          </span>
        </h3>
      </div>

      {hint && <p className="mb-1 text-xs text-muted-foreground">{hint}</p>}

      <ul className="divide-y divide-border">{children}</ul>
    </div>
  );
}

// ============================================================
// COMPUTER ROW
// One computer in the left list. Shows who holds it, or that it
// is still unassigned.
// ============================================================

function ComputerRow({
  system,
  selected,
  onSelect,
}: {
  system: SystemWithOrganisation;
  selected: boolean;
  onSelect: () => void;
}) {
  const holder = system.employee?.name ?? null;
  const parts = system.assignments?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={
        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors " +
        (selected
          ? "border-primary-border bg-primary-muted"
          : "border-transparent hover:bg-muted")
      }
    >
      <span
        className={
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border " +
          (selected
            ? "border-primary-border bg-background text-primary"
            : "border-border bg-muted text-muted-foreground")
        }
      >
        <Monitor className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">
          {system.name}
        </span>

        <span className="block truncate text-xs text-muted-foreground">
          {holder ? (
            <>With {holder}</>
          ) : (
            <span className="font-medium text-warning-strong">Unassigned</span>
          )}
          {` · ${system.category?.name ?? "Category not set"} · ${parts} part${parts === 1 ? "" : "s"}`}
          {system.organisation?.name && (
            <>
              {" · "}
              <Building2 className="mr-0.5 inline h-3 w-3 align-[-2px]" />
              {system.organisation.name}
            </>
          )}
        </span>
      </span>
    </button>
  );
}

