import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import {
  LICENSED_SUBSCRIPTION_TYPES,
  useAssignSoftwareMutation,
  useAssignSoftwareWithChildrenMutation,
  useGetSoftwareLicensesQuery,
  useGetSoftwareListQuery,
} from "../../services/api/software.api";
import { apiErrorMessage } from "../../types/systems";

import { Button } from "../ui/button";
import { toast } from "../ui/toast";

const SELECT_CLASSES =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-ring disabled:cursor-not-allowed disabled:bg-muted";
const LABEL_CLASSES = "mb-1 block text-xs font-medium text-muted-foreground";

interface Props {
  open: boolean;
  onClose: () => void;
  system?: {
    id: string;
    name: string;
    systemTag?: string;
    employeeId: string | null;
  } | null;
  /** Software already installed here (hidden from the picker) */
  installedAssetIds?: string[];
}

export function SoftwareAssignModal({
  open,
  onClose,
  system,
  installedAssetIds = [],
}: Props) {
  const [assetId, setAssetId] = useState("");
  const [licenseChoice, setLicenseChoice] = useState<string>("none"); // none | auto | <licenseId>
  const [withChildren, setWithChildren] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: catalog, isLoading } = useGetSoftwareListQuery(
    { limit: 200, sortBy: "name", sortDir: "ASC" },
    { skip: !open },
  );

  const { data: licenses = [] } = useGetSoftwareLicensesQuery(
    { assetId, hasFreeSeats: true },
    { skip: !open || !assetId },
  );

  const [assign, assignState] = useAssignSoftwareMutation();
  const [assignWithChildren, childrenState] =
    useAssignSoftwareWithChildrenMutation();

  const busy = assignState.isLoading || childrenState.isLoading;

  useEffect(() => {
    if (!open) return;
    setAssetId("");
    setLicenseChoice("none");
    setWithChildren(false);
    setNotes("");
    setError(null);
  }, [open]);

  const options = useMemo(() => {
    const installed = new Set(installedAssetIds);
    return (catalog?.data ?? []).filter((s) => !installed.has(s.assetId));
  }, [catalog, installedAssetIds]);

  const selected = options.find((s) => s.assetId === assetId);

  const usableLicenses = licenses.filter(
    (l) => !l.expiryDate || new Date(l.expiryDate) > new Date(),
  );

  function handleSoftwareChange(nextAssetId: string) {
    setAssetId(nextAssetId);

    const next = options.find((s) => s.assetId === nextAssetId);
    setLicenseChoice(
      next && LICENSED_SUBSCRIPTION_TYPES.includes(next.subscriptionType)
        ? "auto"
        : "none",
    );
  }

  const noEmployee = Boolean(system && !system.employeeId);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!system) return;

    if (!assetId) {
      setError("Please select a software.");
      return;
    }

    setError(null);

    const payload = {
      softwareAssetId: assetId,
      systemId: system.id,
      softwareLicenseId:
        licenseChoice !== "none" && licenseChoice !== "auto"
          ? licenseChoice
          : undefined,
      autoAllocateLicense: licenseChoice === "auto" ? true : undefined,
      notes: notes.trim() || undefined,
    };

    try {
      if (withChildren) {
        await assignWithChildren(payload).unwrap();
      } else {
        await assign(payload).unwrap();
      }

      toast.add({
        title: "Software installed",
        description: `${selected?.asset?.name ?? "Software"} assigned to ${system.name}.`,
        type: "success",
      });

      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (!open || !system) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim px-4">
      <div className="w-full max-w-md rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Install software
            </h2>
            <p className="text-xs text-muted-foreground">
              {system.name}
              {system.systemTag ? ` · ${system.systemTag}` : ""}
            </p>
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

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-5 py-5">
            {noEmployee ? (
              <div className="rounded-md bg-destructive-muted px-3 py-2 text-xs text-destructive-strong">
                This system is not assigned to an employee. Assign it first;
                software can only be installed on assigned systems.
              </div>
            ) : null}

            <div>
              <label className={LABEL_CLASSES}>Software *</label>
              <select
                value={assetId}
                onChange={(e) => handleSoftwareChange(e.target.value)}
                disabled={busy || isLoading}
                className={SELECT_CLASSES}
              >
                <option value="">
                  {isLoading ? "Loading software..." : "Select software"}
                </option>
                {options.map((s) => (
                  <option
                    key={s.assetId}
                    value={s.assetId}
                    disabled={s.usage === "BLOCKED"}
                  >
                    {s.asset?.name ?? s.assetId}
                    {s.version ? ` ${s.version}` : ""}
                    {s.usage === "BLOCKED" ? " (blocked)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASSES}>License</label>
              <select
                value={licenseChoice}
                onChange={(e) => setLicenseChoice(e.target.value)}
                disabled={busy || !assetId}
                className={SELECT_CLASSES}
              >
                <option value="none">No license required</option>
                <option value="auto">Auto-allocate best available seat</option>
                {usableLicenses.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.vendor} · {l.licenseType} (
                    {l.totalSeats - l.assignedSeats} of {l.totalSeats} free)
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Auto-allocate also searches licenses on the parent suite.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={withChildren}
                onChange={(e) => setWithChildren(e.target.checked)}
                disabled={busy}
              />
              Also install child software (for suites)
            </label>

            <div>
              <label className={LABEL_CLASSES}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={busy}
                rows={2}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
              />
            </div>

            {error ? (
              <div className="rounded-md bg-destructive-muted px-3 py-2 text-xs text-destructive-strong">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || noEmployee}>
              {busy ? "Installing..." : "Install"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SoftwareAssignModal;
