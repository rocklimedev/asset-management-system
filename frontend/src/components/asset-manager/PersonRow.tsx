import { useDroppable } from "@dnd-kit/core";
import { clsx } from "clsx";

import type { Asset } from "../../services/api/asset.api";
import type { Employee } from "../../services/api/employees.api";

// ============================================================
// HELPERS
// ============================================================

export function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

// ============================================================
// PERSON ROW
// One line per person in the left-hand list. Selecting a row
// opens that person's equipment on the right. It is also a drop
// target: dragging an assigned asset onto it moves the asset.
// ============================================================

export function PersonRow({
  employee,
  selected,
  onSelect,
}: {
  employee: Employee;
  selected: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `employee-${employee.id}`,
    data: { employee },
  });

  const exited = employee.status === "EXITED";
  const draggingAsset = active?.data.current?.asset as Asset | undefined;

  // A person can't receive the asset they already hold, and exited
  // employees can't receive anything.
  const alreadyHolds =
    draggingAsset?.assignments?.[0]?.employeeId !== undefined &&
    String(draggingAsset.assignments[0].employeeId) === String(employee.id);
  const cannotReceive = Boolean(draggingAsset) && (alreadyHolds || exited);

  const assetCount = (employee.assignments ?? []).length;
  const systemCount = (employee.systems ?? []).length;

  const summary =
    assetCount === 0 && systemCount === 0
      ? "Nothing assigned"
      : [
          assetCount > 0 ? plural(assetCount, "asset") : null,
          systemCount > 0 ? plural(systemCount, "computer") : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-primary-border bg-primary-muted"
          : "border-transparent hover:bg-muted",
        isOver && !cannotReceive && "border-primary bg-primary-muted ring-2 ring-primary-border",
        isOver && cannotReceive && "border-destructive-border bg-destructive-muted",
      )}
    >
      <span
        className={clsx(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-brand-50 text-brand-700",
        )}
      >
        {initials(employee.name)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">
            {employee.name}
          </span>

          {exited && (
            <span className="shrink-0 rounded-full bg-destructive-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-destructive-strong">
              Left
            </span>
          )}
        </span>

        <span className="block truncate text-xs text-muted-foreground">
          {isOver && draggingAsset
            ? cannotReceive
              ? exited
                ? "Can't receive assets"
                : "Already holds this asset"
              : "Drop to move asset here"
            : summary}
        </span>
      </span>
    </button>
  );
}
