import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import {
  useCreateAssetCategoryMutation,
  useCreateAssetMutation,
  useGetAssetCategoriesQuery,
  type AssetCategoryInput,
  type AssetKind,
  type CreateAssetRequest,
} from "../../services/api/asset.api";
import {
  LICENSED_SUBSCRIPTION_TYPES,
  useCreateSoftwareLicenseMutation,
  useCreateSoftwareMutation,
  type SoftwareSubscriptionType,
} from "../../services/api/software.api";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "../ui/toast";
import { cn } from "@/lib/utils";
import { licensingLabel } from "../software/software-ui";

// ============================================================
// QUICK ADD SOFTWARE
//
// Three short steps, like uploading a video: name it, say how
// you pay for it, then add optional details. The user never has
// to create an asset or a category first - this dialog does it.
// Only the name and the payment type are required.
// ============================================================

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: "Name it",
  2: "How is it paid for?",
  3: "Add details (optional)",
};

const CHOICES: {
  value: SoftwareSubscriptionType;
  label: string;
  hint: string;
}[] = [
  { value: "SUBSCRIPTION", label: "Subscription", hint: "Renews monthly or yearly" },
  { value: "PERPETUAL", label: "One-time purchase", hint: "Paid once, kept for good" },
  { value: "COMPANY_LICENSE", label: "Company license", hint: "One agreement covers the team" },
  { value: "FREE", label: "Free", hint: "No cost to use" },
  { value: "OPEN_SOURCE", label: "Open source", hint: "Community maintained" },
  { value: "TRIAL", label: "Trial", hint: "Temporary evaluation" },
];

interface CategoryOption {
  id: string;
  name: string;
  type?: AssetKind;
}

function errorText(error: unknown) {
  const e = error as { data?: { message?: string | string[] }; message?: string };
  const message = e?.data?.message;
  if (Array.isArray(message)) return message.join(". ");
  return message || e?.message || "Nothing was saved. Please try again.";
}

export function QuickAddSoftware({ open, onClose }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [publisher, setPublisher] = useState("");
  const [licensing, setLicensing] = useState<SoftwareSubscriptionType | "">("");
  const [seats, setSeats] = useState(1);
  const [expiryDate, setExpiryDate] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [cost, setCost] = useState("");
  const [version, setVersion] = useState("");
  const [edition, setEdition] = useState("");
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState("");

  /*
   * Saving is three requests (asset, catalog entry, licence). If one fails
   * we remember what already succeeded, so pressing the button again
   * continues instead of creating a duplicate.
   */
  const progress = useRef<{
    categoryId?: string;
    assetId?: string;
    catalogDone?: boolean;
  }>({});

  const [createCategory] = useCreateAssetCategoryMutation();
  const [createAsset] = useCreateAssetMutation();
  const [createSoftware] = useCreateSoftwareMutation();
  const [createLicense] = useCreateSoftwareLicenseMutation();

  const { data: categoriesData } = useGetAssetCategoriesQuery(
    { isActive: true },
    { skip: !open },
  );

  const softwareCategories = useMemo<CategoryOption[]>(() => {
    const list = Array.isArray(categoriesData)
      ? (categoriesData as CategoryOption[])
      : ((categoriesData as { items?: CategoryOption[] } | undefined)?.items ??
        []);
    return list.filter((c) => c.type === "SOFTWARE");
  }, [categoriesData]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setSaving(false);
    setName("");
    setPublisher("");
    setLicensing("");
    setSeats(1);
    setExpiryDate("");
    setLicenseKey("");
    setCost("");
    setVersion("");
    setEdition("");
    setNotes("");
    setCategoryId("");
    progress.current = {};
  }, [open]);

  const isLicensed = licensing !== "" && LICENSED_SUBSCRIPTION_TYPES.includes(licensing);
  const asksExpiry =
    licensing === "SUBSCRIPTION" ||
    licensing === "COMPANY_LICENSE" ||
    licensing === "TRIAL";

  const seatsValid = Number.isInteger(seats) && seats >= 1;

  const canContinue =
    step === 1
      ? name.trim().length > 0
      : step === 2
        ? licensing !== "" && (!isLicensed || seatsValid)
        : true;

  function next() {
    if (canContinue && step < 3) setStep((s) => (s + 1) as Step);
  }

  async function save() {
    if (!licensing) return;
    setSaving(true);

    const title = name.trim();
    const vendor = publisher.trim() || title;

    try {
      // 1. A category to file it under (created automatically if none exist).
      let chosenCategory =
        progress.current.categoryId ||
        categoryId ||
        softwareCategories[0]?.id;

      if (!chosenCategory) {
        const created = await createCategory({
          name: "Software",
          type: "SOFTWARE",
        } as AssetCategoryInput).unwrap();
        chosenCategory = created.id;
      }
      progress.current.categoryId = chosenCategory;

      // 2. The asset itself.
      if (!progress.current.assetId) {
        const response = (await createAsset({
          name: title,
          kind: "SOFTWARE",
          categoryId: chosenCategory,
          quantity: 1,
          status: "AVAILABLE",
          manufacturer: publisher.trim() || undefined,
        } as unknown as CreateAssetRequest).unwrap()) as {
          id?: string;
          data?: { id?: string };
        };

        const assetId = response?.data?.id ?? response?.id;
        if (!assetId) {
          throw new Error("The server did not return an ID for the new software.");
        }
        progress.current.assetId = assetId;
      }

      const assetId = progress.current.assetId;

      // 3. Its catalog entry.
      if (!progress.current.catalogDone) {
        await createSoftware({
          assetId,
          subscriptionType: licensing,
          publisher: publisher.trim() || null,
          version: version.trim() || null,
          edition: edition.trim() || null,
          notes: notes.trim() || null,
        }).unwrap();
        progress.current.catalogDone = true;
      }

      // 4. A licence record, only for paid / licensed software.
      if (isLicensed) {
        await createLicense({
          assetId,
          vendor,
          licenseType: licensingLabel(licensing),
          licenseReference: licenseKey.trim() || null,
          totalSeats: seats,
          expiryDate: asksExpiry && expiryDate ? expiryDate : null,
          cost: cost.trim() ? Number(cost) : null,
        }).unwrap();
      }

      toast.add({
        type: "success",
        title: "Software added",
        description: isLicensed
          ? `${title} is in the catalog with ${seats} seat${seats === 1 ? "" : "s"}.`
          : `${title} is in the catalog.`,
      });
      onClose();
    } catch (error) {
      const partial = progress.current.assetId
        ? " What was already saved is kept, so pressing Add software again will continue from there."
        : "";
      toast.add({
        type: "error",
        title: "Couldn't finish adding this software",
        description: errorText(error) + partial,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !saving && onClose()}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle className="text-base font-semibold text-foreground">
            Add software
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Step {step} of 3 · {STEP_TITLES[step]}
          </DialogDescription>

          <div className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden="true">
            {([1, 2, 3] as Step[]).map((s) => (
              <span
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  s <= step ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 py-5">
          {step === 1 && (
            <>
              <div>
                <label htmlFor="qs-name" className="text-sm font-medium text-foreground">
                  What is it called?
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Use the name people recognise, such as “Microsoft 365”.
                </p>
                <Input
                  id="qs-name"
                  autoFocus
                  value={name}
                  maxLength={150}
                  placeholder="e.g. Microsoft 365"
                  className="mt-2"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") next();
                  }}
                />
              </div>

              <div>
                <label htmlFor="qs-publisher" className="text-sm font-medium text-foreground">
                  Who makes it? <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  id="qs-publisher"
                  value={publisher}
                  placeholder="e.g. Microsoft"
                  className="mt-2"
                  onChange={(e) => setPublisher(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") next();
                  }}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <fieldset>
                <legend className="text-sm font-medium text-foreground">
                  How do you pay for it?
                </legend>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {CHOICES.map((choice) => {
                    const selected = licensing === choice.value;
                    return (
                      <button
                        key={choice.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setLicensing(choice.value)}
                        className={cn(
                          "flex flex-col items-start gap-1 rounded-xl border p-3 text-left shadow-card transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          selected
                            ? "border-primary bg-primary-muted"
                            : "border-border bg-card hover:border-primary-border",
                        )}
                      >
                        <span className="text-sm font-semibold text-foreground">
                          {choice.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {choice.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLicensing("UNKNOWN");
                    setStep(3);
                  }}
                  className="mt-3 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Not sure yet? Skip this
                </button>
              </fieldset>

              {isLicensed && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="qs-seats" className="text-sm font-medium text-foreground">
                      How many seats did you buy?
                    </label>
                    <Input
                      id="qs-seats"
                      type="number"
                      min={1}
                      step={1}
                      value={seats}
                      aria-invalid={!seatsValid}
                      className="mt-1.5"
                      onChange={(e) => setSeats(Number(e.target.value))}
                    />
                    {!seatsValid && (
                      <p className="mt-1 text-xs text-destructive-strong">
                        Enter a whole number of 1 or more.
                      </p>
                    )}
                  </div>

                  {asksExpiry && (
                    <div>
                      <label htmlFor="qs-expiry" className="text-sm font-medium text-foreground">
                        When does it expire?
                      </label>
                      <Input
                        id="qs-expiry"
                        type="date"
                        value={expiryDate}
                        className="mt-1.5"
                        onChange={(e) => setExpiryDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">
                Nothing here is required. Skip any field and add it later from the software&apos;s page.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="qs-version" label="Version" hint="e.g. 2024" value={version} onChange={setVersion} />
                <Field id="qs-edition" label="Edition" hint="e.g. Business Premium" value={edition} onChange={setEdition} />
                {isLicensed && (
                  <>
                    <Field id="qs-key" label="License key or reference" value={licenseKey} onChange={setLicenseKey} />
                    <Field id="qs-cost" label="Cost" type="number" value={cost} onChange={setCost} />
                  </>
                )}
              </div>

              <div>
                <label htmlFor="qs-notes" className="text-sm font-medium text-foreground">
                  Notes
                </label>
                <textarea
                  id="qs-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-inset outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {softwareCategories.length > 1 && (
                <div>
                  <label htmlFor="qs-category" className="text-sm font-medium text-foreground">
                    Category
                  </label>
                  <select
                    id="qs-category"
                    value={categoryId || softwareCategories[0].id}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-inset outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {softwareCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <dl className="rounded-lg bg-muted px-4 py-3 text-sm">
                <Row label="Software" value={name.trim()} />
                {publisher.trim() && <Row label="Made by" value={publisher.trim()} />}
                <Row label="Paid for" value={licensing ? licensingLabel(licensing) : "—"} />
                {isLicensed && <Row label="Seats" value={String(seats)} />}
              </dl>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-card px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            disabled={saving}
            onClick={() => (step === 1 ? onClose() : setStep((s) => (s - 1) as Step))}
          >
            {step === 1 ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </>
            )}
          </Button>

          {step < 3 ? (
            <Button type="button" disabled={!canContinue} onClick={next}>
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button type="button" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Add software"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  id,
  label,
  hint,
  value,
  type,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={id}
        type={type}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        placeholder={hint}
        className="mt-1.5"
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  );
}

export default QuickAddSoftware;
