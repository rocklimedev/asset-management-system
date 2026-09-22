import { useMemo, useState } from "react";
import { Monitor, Search, X } from "lucide-react";

import {
  useGetSystemsQuery,
  useAssignSystemMutation,
  type SystemRecord,
} from "../../services/api/asset.api";
import type { Employee } from "../../services/api/employees.api";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { toast } from "../ui/toast";

// ============================================================
// TYPES
// ============================================================

interface SystemPoolProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
}

// ============================================================
// HELPERS
// ============================================================

function errorMessage(error: unknown, fallback: string): string {
  const value = (error as { data?: { message?: string | string[] } })?.data
    ?.message;

  if (Array.isArray(value)) {
    return value.join(". ");
  }

  return value ?? fallback;
}

// ============================================================
// COMPONENT
// ============================================================

export function SystemPool({ open, employee, onClose }: SystemPoolProps) {
  const [search, setSearch] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // ------------------------------------------------------------
  // Systems (only fetched while the pool is open)
  // ------------------------------------------------------------

  const {
    data: systems = [],
    isLoading,
    isError,
    refetch,
  } = useGetSystemsQuery(undefined, { skip: !open });

  const [assignSystem, { isLoading: isAssigning }] = useAssignSystemMutation();

  // ------------------------------------------------------------
  // Only systems with no employee are eligible for the pool
  // ------------------------------------------------------------

  const unassigned = useMemo(
    () => systems.filter((system) => !system.employeeId),
    [systems],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return unassigned;
    }

    return unassigned.filter((system) =>
      `${system.name} ${system.systemTag}`.toLowerCase().includes(query),
    );
  }, [unassigned, search]);

  // ------------------------------------------------------------
  // Close (reset local state)
  // ------------------------------------------------------------

  function handleClose() {
    if (isAssigning) {
      return;
    }

    setSearch("");
    onClose();
  }

  // ------------------------------------------------------------
  // Assign a system to the target employee
  // ------------------------------------------------------------

  async function handleAssign(system: SystemRecord) {
    if (!employee) {
      return;
    }

    setAssigningId(system.id);

    try {
      await assignSystem({
        id: system.id,
        employeeId: employee.id,
      }).unwrap();

      toast.add({
        type: "success",
        title: "System assigned",
        description: `${system.name} assigned to ${employee.name}. Its components moved with it.`,
      });

      handleClose();
    } catch (error) {
      toast.add({
        type: "error",
        title: "Assignment failed",
        description: errorMessage(
          error,
          "Could not assign this system. Please try again.",
        ),
      });
    } finally {
      setAssigningId(null);
    }
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign a system</DialogTitle>

          <DialogDescription>
            {employee
              ? `Pick an unassigned system to give to ${employee.name}. All of its components move with it.`
              : "Pick an unassigned system."}
          </DialogDescription>
        </DialogHeader>

        {/* Search */}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search systems..."
            className="pl-9"
            autoFocus
          />
        </div>

        {/* Results */}

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Loading systems…
            </p>
          ) : isError ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Could not load systems.{" "}
              <Button variant="outline" size="sm" onClick={refetch}>
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {unassigned.length === 0
                ? "No unassigned systems available."
                : "No systems match your search."}
            </p>
          ) : (
            filtered.map((system) => (
              <div
                key={system.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Monitor className="h-5 w-5 shrink-0 text-muted-foreground" />

                <div className="mr-auto min-w-0">
                  <p className="truncate text-sm font-medium">{system.name}</p>

                  <p className="truncate text-xs text-muted-foreground">
                    {system.systemTag} · {system.assignments?.length ?? 0}{" "}
                    component
                    {(system.assignments?.length ?? 0) === 1 ? "" : "s"}
                  </p>
                </div>

                <Button
                  size="sm"
                  disabled={isAssigning}
                  onClick={() => handleAssign(system)}
                >
                  {isAssigning && assigningId === system.id
                    ? "Assigning…"
                    : "Assign"}
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SystemPool;
