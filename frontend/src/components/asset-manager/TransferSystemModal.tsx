// components/asset-manager/TransferSystemModal.tsx
import { useState, useEffect } from "react";
import { Monitor, X, Undo2 } from "lucide-react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";

import type { SystemRecord } from "../../services/api/asset.api";
import type { Employee } from "../../services/api/employees.api";

interface TransferSystemModalProps {
  open: boolean;
  onClose: () => void;
  system: SystemRecord | null;
  /** Current owner (null when system is unassigned). */
  fromEmployee: Employee | null;
  /** Pre-selected destination (optional). */
  toEmployee: Employee | null;
  /** Full list for the picker when pickMode is true. */
  employeeOptions?: Employee[];
  onSelectEmployee?: (employeeId: string) => void;
  onConfirm: (employeeId: string, notes?: string) => void;
  /**
   * Return the destination employee's existing system(s) to the pool
   * before assigning the new one. Resolve when done so the modal can continue.
   */
  onReturnExistingSystem?: (employee: Employee) => Promise<void>;
  loading?: boolean;
  /**
   * When true, selecting an employee who already has a system
   * shows a warning but still allows the transfer.
   * Set to false to hard-block unless they return first.
   */
  allowReplace?: boolean;
}

export function TransferSystemModal({
  open,
  onClose,
  system,
  fromEmployee,
  toEmployee,
  employeeOptions,
  onSelectEmployee,
  onConfirm,
  onReturnExistingSystem,
  loading = false,
  allowReplace = true,
}: TransferSystemModalProps) {
  const [notes, setNotes] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [returning, setReturning] = useState(false);
  /** After a successful return in this session, treat destination as free. */
  const [clearedEmployeeId, setClearedEmployeeId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    setNotes("");
    setSelectedId(toEmployee?.id ? String(toEmployee.id) : "");
    setReturning(false);
    setClearedEmployeeId(null);
  }, [open, toEmployee?.id]);

  if (!open || !system) return null;

  const isPickMode = Boolean(employeeOptions && onSelectEmployee);
  const effectiveId = isPickMode
    ? selectedId
    : toEmployee
      ? String(toEmployee.id)
      : "";
  const destination = isPickMode
    ? (employeeOptions?.find((e) => String(e.id) === effectiveId) ?? null)
    : toEmployee;

  const destinationSystems =
    destination && String(destination.id) !== clearedEmployeeId
      ? (destination.systems ?? [])
      : [];

  const alreadyHasSystem = destinationSystems.length > 0;

  const busy = loading || returning;

  const canSubmit =
    Boolean(effectiveId) && !busy && (allowReplace || !alreadyHasSystem);

  async function handleReturnThenAssign() {
    if (!destination || !onReturnExistingSystem || !effectiveId) return;

    setReturning(true);
    try {
      await onReturnExistingSystem(destination);
      setClearedEmployeeId(String(destination.id));
      // Immediately assign the new system after return
      onConfirm(effectiveId, notes.trim() || undefined);
    } catch {
      // Parent should toast; stay on modal
    } finally {
      setReturning(false);
    }
  }

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !effectiveId) return;
    onConfirm(effectiveId, notes.trim() || undefined);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim px-4">
      <div className="w-full max-w-md rounded-lg bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {fromEmployee ? "Transfer system" : "Assign system"}
              </h2>
              <p className="text-xs text-muted-foreground">
                All components stay with the system.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm}>
          <div className="space-y-4 px-5 py-5">
            {/* System summary */}
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium text-foreground">{system.name}</p>
              <p className="text-xs text-muted-foreground">
                {system.systemTag} · {system.assignments?.length ?? 0} component
                {(system.assignments?.length ?? 0) !== 1 ? "s" : ""}
              </p>
            </div>

            {/* From → To */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  From
                </p>
                <p className="rounded-md border border-border px-3 py-2">
                  {fromEmployee?.name ?? "Unassigned"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  To *
                </p>
                {isPickMode ? (
                  <select
                    value={selectedId}
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      setClearedEmployeeId(null);
                      onSelectEmployee?.(e.target.value);
                    }}
                    disabled={busy}
                    className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-ring"
                    required
                  >
                    <option value="">Select employee</option>
                    {employeeOptions?.map((emp) => (
                      <option
                        key={emp.id}
                        value={emp.id}
                        disabled={String(emp.id) === String(fromEmployee?.id)}
                      >
                        {emp.name}
                        {(emp.systems?.length ?? 0) > 0
                          ? " (already has system)"
                          : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="rounded-md border border-border px-3 py-2">
                    {toEmployee?.name ?? "—"}
                  </p>
                )}
              </div>
            </div>

            {/* Warning + return existing */}
            {alreadyHasSystem && (
              <div
                className={`space-y-2 rounded-md px-3 py-2 text-xs ${
                  allowReplace
                    ? "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                    : "bg-destructive-muted text-destructive-strong"
                }`}
              >
                <p>
                  <strong>{destination?.name}</strong> already has{" "}
                  {destinationSystems.length === 1
                    ? "a system"
                    : `${destinationSystems.length} systems`}
                  :
                </p>
                <ul className="list-inside list-disc space-y-0.5">
                  {destinationSystems.map((s) => (
                    <li key={s.id}>
                      {s.name}
                      {s.systemTag ? ` (${s.systemTag})` : ""}
                    </li>
                  ))}
                </ul>
                <p>
                  {allowReplace
                    ? "You can return their current system first, then assign this one — or assign without returning (they will hold both)."
                    : "Return their current system before assigning another."}
                </p>

                {onReturnExistingSystem && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    className="mt-1 w-full"
                    onClick={handleReturnThenAssign}
                  >
                    <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                    {returning
                      ? "Returning & assigning…"
                      : "Return existing system, then assign"}
                  </Button>
                )}
              </div>
            )}

            {clearedEmployeeId &&
              String(destination?.id) === clearedEmployeeId && (
                <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  Existing system returned. You can confirm the new assignment
                  below if it didn’t complete automatically.
                </p>
              )}

            {/* Notes */}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Notes (optional)
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for transfer / assignment"
                disabled={busy}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {busy
                ? fromEmployee
                  ? "Transferring…"
                  : "Assigning…"
                : fromEmployee
                  ? "Transfer system"
                  : "Assign system"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
