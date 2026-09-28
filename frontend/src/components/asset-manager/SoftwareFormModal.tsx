import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { useGetSoftwareAssetsQuery } from "../../services/api/asset.api";
import {
  SOFTWARE_SUBSCRIPTION_OPTIONS,
  SOFTWARE_USAGE_OPTIONS,
  useCreateSoftwareMutation,
  useGetSoftwareListQuery,
  useUpdateSoftwareMutation,
  type SoftwareRecord,
  type SoftwareSubscriptionType,
  type SoftwareUsage,
} from "../../services/api/software.api";
import { apiErrorMessage } from "../../types/systems";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "../ui/toast";

const SELECT_CLASSES =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";
const LABEL_CLASSES = "mb-1 block text-xs font-medium text-muted-foreground";

interface FormValues {
  assetId: string;
  parentSoftwareId: string;
  usage: SoftwareUsage;
  subscriptionType: SoftwareSubscriptionType;
  warrantyApplicable: boolean;
  version: string;
  edition: string;
  publisher: string;
  notes: string;
}

const EMPTY: FormValues = {
  assetId: "",
  parentSoftwareId: "",
  usage: "UNKNOWN",
  subscriptionType: "UNKNOWN",
  warrantyApplicable: false,
  version: "",
  edition: "",
  publisher: "",
  notes: "",
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pass a record to edit, omit / null to create */
  software?: SoftwareRecord | null;
}

export function SoftwareFormModal({ open, onClose, software }: Props) {
  const isEdit = Boolean(software?.id);

  const [values, setValues] = useState<FormValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const { data: softwareAssets = [] } = useGetSoftwareAssetsQuery(undefined, {
    skip: !open || isEdit,
  });

  const { data: catalog } = useGetSoftwareListQuery(
    { limit: 200 },
    { skip: !open },
  );

  const [createSoftware, createState] = useCreateSoftwareMutation();
  const [updateSoftware, updateState] = useUpdateSoftwareMutation();
  const busy = createState.isLoading || updateState.isLoading;

  useEffect(() => {
    if (!open) return;
    setError(null);

    setValues(
      software
        ? {
            assetId: software.assetId,
            parentSoftwareId: software.parentSoftwareId ?? "",
            usage: software.usage,
            subscriptionType: software.subscriptionType,
            warrantyApplicable: software.warrantyApplicable,
            version: software.version ?? "",
            edition: software.edition ?? "",
            publisher: software.publisher ?? "",
            notes: software.notes ?? "",
          }
        : { ...EMPTY },
    );
  }, [open, software]);

  // Software assets that do not have catalog details yet
  const availableAssets = useMemo(() => {
    const used = new Set((catalog?.data ?? []).map((s) => s.assetId));
    return (Array.isArray(softwareAssets) ? softwareAssets : []).filter(
      (a) => !used.has(a.id),
    );
  }, [softwareAssets, catalog]);

  // Possible parents = every other catalogued software
  const parentOptions = useMemo(
    () =>
      (catalog?.data ?? [])
        .filter((s) => s.assetId !== values.assetId)
        .map((s) => ({ id: s.assetId, name: s.asset?.name ?? s.assetId })),
    [catalog, values.assetId],
  );

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!isEdit && !values.assetId) {
      setError("Please select a software asset.");
      return;
    }

    setError(null);

    const shared = {
      parentSoftwareId: values.parentSoftwareId || null,
      usage: values.usage,
      subscriptionType: values.subscriptionType,
      warrantyApplicable: values.warrantyApplicable,
      version: values.version.trim() || null,
      edition: values.edition.trim() || null,
      publisher: values.publisher.trim() || null,
      notes: values.notes.trim() || null,
    };

    try {
      if (isEdit && software) {
        await updateSoftware({ id: software.id, ...shared }).unwrap();
        toast.add({ title: "Software updated", type: "success" });
      } else {
        await createSoftware({ assetId: values.assetId, ...shared }).unwrap();
        toast.add({ title: "Software added to catalog", type: "success" });
      }

      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim px-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {isEdit ? "Edit software" : "Add software"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isEdit
                ? "Update catalog details for this software."
                : "Add catalog details to an existing software asset."}
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
          <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
            {/* SOFTWARE ASSET */}
            <div className="sm:col-span-2">
              <label className={LABEL_CLASSES}>Software asset *</label>

              {isEdit ? (
                <Input value={software?.asset?.name ?? ""} disabled />
              ) : (
                <select
                  value={values.assetId}
                  onChange={(e) => setField("assetId", e.target.value)}
                  disabled={busy}
                  className={SELECT_CLASSES}
                >
                  <option value="">Select software asset</option>
                  {availableAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name}
                      {asset.assetTag ? ` (${asset.assetTag})` : ""}
                    </option>
                  ))}
                </select>
              )}

              {!isEdit && availableAssets.length === 0 ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Every software asset already has catalog details. Create a new
                  asset with kind &quot;Software&quot; first.
                </p>
              ) : null}
            </div>

            {/* PARENT */}
            <div className="sm:col-span-2">
              <label className={LABEL_CLASSES}>
                Parent software (suite / product family)
              </label>
              <select
                value={values.parentSoftwareId}
                onChange={(e) => setField("parentSoftwareId", e.target.value)}
                disabled={busy}
                className={SELECT_CLASSES}
              >
                <option value="">None (top-level)</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* USAGE */}
            <div>
              <label className={LABEL_CLASSES}>Usage</label>
              <select
                value={values.usage}
                onChange={(e) =>
                  setField("usage", e.target.value as SoftwareUsage)
                }
                disabled={busy}
                className={SELECT_CLASSES}
              >
                {SOFTWARE_USAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* SUBSCRIPTION */}
            <div>
              <label className={LABEL_CLASSES}>Licensing model</label>
              <select
                value={values.subscriptionType}
                onChange={(e) =>
                  setField(
                    "subscriptionType",
                    e.target.value as SoftwareSubscriptionType,
                  )
                }
                disabled={busy}
                className={SELECT_CLASSES}
              >
                {SOFTWARE_SUBSCRIPTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={LABEL_CLASSES}>Version</label>
              <Input
                value={values.version}
                onChange={(e) => setField("version", e.target.value)}
                placeholder="e.g. 2024"
                disabled={busy}
              />
            </div>

            <div>
              <label className={LABEL_CLASSES}>Edition</label>
              <Input
                value={values.edition}
                onChange={(e) => setField("edition", e.target.value)}
                placeholder="e.g. Professional"
                disabled={busy}
              />
            </div>

            <div>
              <label className={LABEL_CLASSES}>Publisher</label>
              <Input
                value={values.publisher}
                onChange={(e) => setField("publisher", e.target.value)}
                placeholder="e.g. Adobe"
                disabled={busy}
              />
            </div>

            <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={values.warrantyApplicable}
                onChange={(e) =>
                  setField("warrantyApplicable", e.target.checked)
                }
                disabled={busy}
              />
              Vendor warranty / support applies
            </label>

            <div className="sm:col-span-2">
              <label className={LABEL_CLASSES}>Notes</label>
              <textarea
                value={values.notes}
                onChange={(e) => setField("notes", e.target.value)}
                disabled={busy}
                rows={3}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring disabled:cursor-not-allowed disabled:bg-muted"
              />
            </div>
          </div>

          {error ? (
            <div className="mx-5 mb-4 rounded-md bg-destructive-muted px-3 py-2 text-xs text-destructive-strong">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : isEdit ? "Save changes" : "Add software"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SoftwareFormModal;
