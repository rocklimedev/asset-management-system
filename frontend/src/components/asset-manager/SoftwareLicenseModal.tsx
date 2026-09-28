import { useEffect, useState } from "react";
import { X } from "lucide-react";

import {
  useCreateSoftwareLicenseMutation,
  useUpdateSoftwareLicenseMutation,
  type SoftwareLicenseRecord,
} from "../../services/api/software.api";
import { apiErrorMessage } from "../../types/systems";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "../ui/toast";

const LABEL_CLASSES = "mb-1 block text-xs font-medium text-muted-foreground";

interface FormValues {
  vendor: string;
  licenseType: string;
  licenseReference: string;
  totalSeats: number;
  purchaseDate: string;
  expiryDate: string;
  renewalDate: string;
  cost: string;
}

const EMPTY: FormValues = {
  vendor: "",
  licenseType: "",
  licenseReference: "",
  totalSeats: 1,
  purchaseDate: "",
  expiryDate: "",
  renewalDate: "",
  cost: "",
};

const toDateInput = (v?: string | null) => (v ? String(v).slice(0, 10) : "");

interface Props {
  open: boolean;
  onClose: () => void;
  /** The software asset the license belongs to */
  assetId: string;
  license?: SoftwareLicenseRecord | null;
  defaultVendor?: string | null;
}

export function SoftwareLicenseModal({
  open,
  onClose,
  assetId,
  license,
  defaultVendor,
}: Props) {
  const isEdit = Boolean(license?.id);

  const [values, setValues] = useState<FormValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const [createLicense, createState] = useCreateSoftwareLicenseMutation();
  const [updateLicense, updateState] = useUpdateSoftwareLicenseMutation();
  const busy = createState.isLoading || updateState.isLoading;

  useEffect(() => {
    if (!open) return;
    setError(null);

    setValues(
      license
        ? {
            vendor: license.vendor,
            licenseType: license.licenseType,
            licenseReference: license.licenseReference ?? "",
            totalSeats: license.totalSeats,
            purchaseDate: toDateInput(license.purchaseDate),
            expiryDate: toDateInput(license.expiryDate),
            renewalDate: toDateInput(license.renewalDate),
            cost: license.cost != null ? String(license.cost) : "",
          }
        : { ...EMPTY, vendor: defaultVendor ?? "" },
    );
  }, [open, license, defaultVendor]);

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!values.vendor.trim() || !values.licenseType.trim()) {
      setError("Vendor and license type are required.");
      return;
    }

    if (!Number.isInteger(values.totalSeats) || values.totalSeats < 1) {
      setError("Total seats must be a whole number of at least 1.");
      return;
    }

    if (
      values.purchaseDate &&
      values.expiryDate &&
      values.expiryDate < values.purchaseDate
    ) {
      setError("Expiry date cannot be before the purchase date.");
      return;
    }

    setError(null);

    const payload = {
      vendor: values.vendor.trim(),
      licenseType: values.licenseType.trim(),
      licenseReference: values.licenseReference.trim() || null,
      totalSeats: values.totalSeats,
      purchaseDate: values.purchaseDate || null,
      expiryDate: values.expiryDate || null,
      renewalDate: values.renewalDate || null,
      cost: values.cost.trim() ? Number(values.cost) : null,
    };

    try {
      if (isEdit && license) {
        await updateLicense({ id: license.id, ...payload }).unwrap();
        toast.add({ title: "License updated", type: "success" });
      } else {
        await createLicense({ assetId, ...payload }).unwrap();
        toast.add({ title: "License added", type: "success" });
      }

      onClose();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim px-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            {isEdit ? "Edit license" : "Add license"}
          </h2>

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
            <div>
              <label className={LABEL_CLASSES}>Vendor *</label>
              <Input
                value={values.vendor}
                onChange={(e) => setField("vendor", e.target.value)}
                disabled={busy}
              />
            </div>

            <div>
              <label className={LABEL_CLASSES}>License type *</label>
              <Input
                value={values.licenseType}
                onChange={(e) => setField("licenseType", e.target.value)}
                placeholder="e.g. Volume, Per-user"
                disabled={busy}
              />
            </div>

            <div>
              <label className={LABEL_CLASSES}>License key / reference</label>
              <Input
                value={values.licenseReference}
                onChange={(e) => setField("licenseReference", e.target.value)}
                disabled={busy}
              />
            </div>

            <div>
              <label className={LABEL_CLASSES}>Total seats *</label>
              <Input
                type="number"
                min={1}
                step={1}
                value={values.totalSeats}
                onChange={(e) => setField("totalSeats", Number(e.target.value))}
                disabled={busy}
              />
              {isEdit && license ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {license.assignedSeats} seat(s) currently in use.
                </p>
              ) : null}
            </div>

            <div>
              <label className={LABEL_CLASSES}>Purchase date</label>
              <Input
                type="date"
                value={values.purchaseDate}
                onChange={(e) => setField("purchaseDate", e.target.value)}
                disabled={busy}
              />
            </div>

            <div>
              <label className={LABEL_CLASSES}>Expiry date</label>
              <Input
                type="date"
                value={values.expiryDate}
                onChange={(e) => setField("expiryDate", e.target.value)}
                disabled={busy}
              />
            </div>

            <div>
              <label className={LABEL_CLASSES}>Renewal date</label>
              <Input
                type="date"
                value={values.renewalDate}
                onChange={(e) => setField("renewalDate", e.target.value)}
                disabled={busy}
              />
            </div>

            <div>
              <label className={LABEL_CLASSES}>Cost</label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={values.cost}
                onChange={(e) => setField("cost", e.target.value)}
                disabled={busy}
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
              {busy ? "Saving..." : isEdit ? "Save changes" : "Add license"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SoftwareLicenseModal;
