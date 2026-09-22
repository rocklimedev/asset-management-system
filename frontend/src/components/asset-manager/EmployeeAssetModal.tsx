// components/asset-manager/EmployeeAssetModal.tsx
import { useMemo, useState } from "react";
import { Package, Monitor, Trash2, CheckSquare, Square } from "lucide-react";

import {
  useReturnAssetMutation,
  type AssetAssignment,
} from "../../services/api/asset.api";
import type { Employee } from "../../services/api/employees.api";

import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";
import { toast } from "../ui/toast";

interface EmployeeAssetModalProps {
  employee: Employee | null;
  open: boolean;
  onClose: () => void;
  /** Called after a successful removal so the parent can refetch the employee list/drawer. */
  onRemoved?: () => void;
}

function message(error: unknown) {
  const value = (error as { data?: { message?: string | string[] } })?.data
    ?.message;
  return Array.isArray(value)
    ? value.join(". ")
    : (value ?? "Please try again.");
}

export default function EmployeeAssetModal({
  employee,
  open,
  onClose,
  onRemoved,
}: EmployeeAssetModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [returnAsset] = useReturnAssetMutation();
  const [removing, setRemoving] = useState(false);

  // Direct assignments plus anything assigned via a system this employee owns.
  const assignments: AssetAssignment[] = useMemo(() => {
    if (!employee) return [];
    const direct = (employee.assignments ?? []).filter(
      (a) => a.status === "ACTIVE" && !a.systemId,
    );
    const viaSystems = (employee.systems ?? []).flatMap(
      (system) => system.assignments ?? [],
    );
    return [...direct, ...viaSystems];
  }, [employee]);

  const toggleOne = (assetId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  };

  const allSelected =
    assignments.length > 0 && assignments.every((a) => selected.has(a.assetId));

  const toggleAll = () => {
    setSelected(
      allSelected ? new Set() : new Set(assignments.map((a) => a.assetId)),
    );
  };

  const handleClose = () => {
    if (removing) return;
    setSelected(new Set());
    onClose();
  };

  async function removeSelected() {
    if (!selected.size) return;
    const confirmed = window.confirm(
      `Remove ${selected.size} asset${selected.size > 1 ? "s" : ""} from ${employee?.name}?`,
    );
    if (!confirmed) return;

    setRemoving(true);
    const ids = Array.from(selected);
    const results = await Promise.allSettled(
      ids.map((id) =>
        returnAsset({
          id,
          notes: "Removed via employee asset manager",
        }).unwrap(),
      ),
    );
    setRemoving(false);

    const failed = results.filter((r) => r.status === "rejected");
    const succeeded = results.length - failed.length;

    if (succeeded) {
      toast.add({
        title: `${succeeded} asset${succeeded > 1 ? "s" : ""} removed`,
        type: "success",
      });
    }
    if (failed.length) {
      const first = failed[0] as PromiseRejectedResult;
      toast.add({
        title: `Failed to remove ${failed.length} asset${failed.length > 1 ? "s" : ""}`,
        description: message(first.reason),
        type: "error",
      });
    }

    setSelected(new Set());
    onRemoved?.();
    if (!failed.length) handleClose();
  }

  async function removeSingle(assetId: string) {
    setRemoving(true);
    try {
      await returnAsset({
        id: assetId,
        notes: "Removed from employee",
      }).unwrap();
      toast.add({ title: "Asset removed", type: "success" });
      setSelected((current) => {
        const next = new Set(current);
        next.delete(assetId);
        return next;
      });
      onRemoved?.();
    } catch (error) {
      toast.add({
        title: "Could not remove asset",
        description: message(error),
        type: "error",
      });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Dialog open={open && !!employee} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage assets · {employee?.name}</DialogTitle>
          <DialogDescription>
            Select one or more assets to remove them from this employee at once.
          </DialogDescription>
        </DialogHeader>

        {assignments.length ? (
          <>
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {allSelected ? "Deselect all" : "Select all"}
            </button>

            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <Checkbox
                    checked={selected.has(a.assetId)}
                    onCheckedChange={() => toggleOne(a.assetId)}
                    aria-label={`Select ${a.asset?.name ?? "asset"}`}
                  />
                  {a.systemId ? (
                    <Monitor className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Package className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="mr-auto min-w-0">
                    <p className="truncate text-sm font-medium">
                      {a.asset?.name ?? "Unknown asset"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.asset?.assetTag ?? "No tag"}
                      {a.systemId ? ` · via ${a.system?.name ?? "system"}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={removing}
                    onClick={() => removeSingle(a.assetId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-xs text-muted-foreground">
                {selected.size} selected
              </p>
              <Button
                variant="destructive"
                disabled={!selected.size || removing}
                onClick={removeSelected}
              >
                {removing
                  ? "Removing…"
                  : `Remove ${selected.size || ""} asset${selected.size === 1 ? "" : "s"}`}
              </Button>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            This employee has no assigned assets.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
