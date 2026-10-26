import { useEffect, useMemo, useState } from 'react';
import { AppWindow, ArrowLeft, ArrowRight, Laptop } from 'lucide-react';

import {
  useCreateAssetMutation,
  useGetAssetCategoriesQuery,
  type AssetKind,
  type CreateAssetRequest,
} from '../../services/api/asset.api';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from '../ui/toast';
import { cn } from '@/lib/utils';

// ============================================================
// QUICK ADD ASSET
//
// Three short steps, like uploading a video: name it, say what
// kind it is, then add any extra details. Only the name and the
// category are required. Everything else can be filled in later.
// The full form is still available for advanced records.
// ============================================================

interface QuickAddAssetProps {
  open: boolean;
  onClose: () => void;
  /** Opens the complete asset form for advanced fields. */
  onOpenFullForm: () => void;
}

interface CategoryOption {
  id: string;
  name: string;
  type?: AssetKind;
}

type Step = 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  1: 'Name it',
  2: 'Choose a category',
  3: 'Add details (optional)',
};

function errorText(error: unknown) {
  const e = error as { data?: { message?: string }; message?: string };
  return e?.data?.message || e?.message || 'Nothing was saved. Please try again.';
}

export function QuickAddAsset({ open, onClose, onOpenFullForm }: QuickAddAssetProps) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AssetKind>('HARDWARE');
  const [categoryId, setCategoryId] = useState('');
  const [several, setSeveral] = useState(false);
  const [quantity, setQuantity] = useState(2);
  const [assetTag, setAssetTag] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');

  const [createAsset, { isLoading: saving }] = useCreateAssetMutation();

  const { data: categoriesData } = useGetAssetCategoriesQuery({ isActive: true }, { skip: !open });

  const categories = useMemo<CategoryOption[]>(() => {
    const list = Array.isArray(categoriesData)
      ? (categoriesData as CategoryOption[])
      : ((categoriesData as { items?: CategoryOption[] } | undefined)?.items ?? []);
    // Show categories that match the chosen type; untyped ones always show.
    return list.filter((category) => !category.type || category.type === kind);
  }, [categoriesData, kind]);

  // Every time the dialog opens, start again from step 1.
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setName('');
    setKind('HARDWARE');
    setCategoryId('');
    setSeveral(false);
    setQuantity(2);
    setAssetTag('');
    setSerialNumber('');
    setManufacturer('');
    setModel('');
  }, [open]);

  // A category from the other type can't be kept after switching type.
  useEffect(() => {
    if (categoryId && !categories.some((c) => c.id === categoryId)) {
      setCategoryId('');
    }
  }, [categories, categoryId]);

  const finalQuantity = several ? Math.max(2, Math.floor(quantity) || 2) : 1;

  const canContinue =
    step === 1
      ? name.trim().length > 0
      : step === 2
        ? Boolean(categoryId) && finalQuantity >= 1
        : true;

  async function save() {
    // Each physical item needs a unit record. Codes are generated so the
    // user never has to type them.
    const stamp = Date.now().toString(36).slice(-4).toUpperCase();
    const prefix =
      (assetTag.trim() || name.trim())
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 8)
        .toUpperCase() || 'ITEM';

    const initialUnits = Array.from({ length: finalQuantity }, (_, index) => ({
      unitCode: `${prefix}-${stamp}-${String(index + 1).padStart(2, '0')}`,
      serialNumber: finalQuantity === 1 ? serialNumber.trim() || undefined : undefined,
      cellularIdentities: [],
      status: 'AVAILABLE',
      condition: 'GOOD',
    }));

    const payload = {
      name: name.trim(),
      kind,
      categoryId,
      trackingMode: finalQuantity > 1 ? 'QUANTITY' : 'INDIVIDUAL',
      quantity: finalQuantity,
      status: 'AVAILABLE',
      condition: 'GOOD',
      assetTag: assetTag.trim() || undefined,
      manufacturer: manufacturer.trim() || undefined,
      model: model.trim() || undefined,
      initialUnits,
    } as unknown as CreateAssetRequest;

    try {
      await createAsset(payload).unwrap();
      toast.add({
        type: 'success',
        title: 'Added to All Assets',
        description: `${name.trim()} is now in stock.`,
      });
      onClose();
    } catch (error) {
      toast.add({
        type: 'error',
        title: "Couldn't add this item",
        description: errorText(error),
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && !saving && onClose()}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-4 text-left">
          <DialogTitle className="text-base font-semibold text-foreground">
            Add new equipment
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Step {step} of 3 · {STEP_TITLES[step]}
          </DialogDescription>

          {/* Progress, one segment per step */}
          <div className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden="true">
            {([1, 2, 3] as Step[]).map((s) => (
              <span
                key={s}
                className={cn(
                  'h-1.5 rounded-full transition-colors',
                  s <= step ? 'bg-primary' : 'bg-muted',
                )}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {step === 1 && (
            <>
              <div>
                <label htmlFor="qa-name" className="text-sm font-medium text-foreground">
                  What is it called?
                </label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Use the name people will recognise, such as “Dell Latitude 5440”.
                </p>
                <Input
                  id="qa-name"
                  autoFocus
                  value={name}
                  maxLength={255}
                  placeholder="e.g. Dell Latitude 5440"
                  className="mt-2"
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && canContinue) setStep(2);
                  }}
                />
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-foreground">What type is it?</legend>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(
                    [
                      {
                        value: 'HARDWARE',
                        label: 'A physical item',
                        hint: 'Laptop, phone, monitor, keyboard',
                        icon: Laptop,
                      },
                      {
                        value: 'SOFTWARE',
                        label: 'A software licence',
                        hint: 'Office, design tools, antivirus',
                        icon: AppWindow,
                      },
                    ] as const
                  ).map((option) => {
                    const selected = kind === option.value;
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setKind(option.value)}
                        className={cn(
                          'flex flex-col items-start gap-2 rounded-xl border p-4 text-left shadow-card transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          selected
                            ? 'border-primary bg-primary-muted'
                            : 'border-border bg-card hover:border-primary-border',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-5 w-5',
                            selected ? 'text-primary' : 'text-muted-foreground',
                          )}
                          aria-hidden="true"
                        />
                        <span className="text-sm font-semibold text-foreground">
                          {option.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{option.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label htmlFor="qa-category" className="text-sm font-medium text-foreground">
                  Which category is it?
                </label>

                {categories.length > 0 ? (
                  <select
                    id="qa-category"
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-inset outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Choose a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    There are no {kind === 'SOFTWARE' ? 'software' : 'hardware'} categories yet.{' '}
                    <button
                      type="button"
                      onClick={onOpenFullForm}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Create one in the full form
                    </button>
                    .
                  </div>
                )}
              </div>

              <fieldset>
                <legend className="text-sm font-medium text-foreground">
                  How many do you have?
                </legend>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    aria-pressed={!several}
                    onClick={() => setSeveral(false)}
                    className={cn(
                      'rounded-xl border p-4 text-left shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      !several ? 'border-primary bg-primary-muted' : 'border-border bg-card',
                    )}
                  >
                    <span className="block text-sm font-semibold text-foreground">Just one</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Tracked on its own
                    </span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={several}
                    onClick={() => setSeveral(true)}
                    className={cn(
                      'rounded-xl border p-4 text-left shadow-card outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      several ? 'border-primary bg-primary-muted' : 'border-border bg-card',
                    )}
                  >
                    <span className="block text-sm font-semibold text-foreground">
                      Several identical
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Such as 10 mice or 25 licences
                    </span>
                  </button>
                </div>

                {several && (
                  <div className="mt-3 flex items-center gap-3">
                    <label htmlFor="qa-quantity" className="text-sm text-foreground">
                      How many?
                    </label>
                    <Input
                      id="qa-quantity"
                      type="number"
                      min={2}
                      className="w-28"
                      value={quantity}
                      onChange={(event) => setQuantity(Number(event.target.value))}
                    />
                  </div>
                )}
              </fieldset>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">
                Nothing here is required. You can leave any field empty and add it later from the
                item’s page.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {finalQuantity === 1 && (
                  <Field label="Serial number" value={serialNumber} onChange={setSerialNumber} />
                )}
                <Field
                  label="Asset tag"
                  hint="Your own label, e.g. LT-0101"
                  value={assetTag}
                  onChange={setAssetTag}
                />
                <Field
                  label="Manufacturer"
                  hint="e.g. Dell"
                  value={manufacturer}
                  onChange={setManufacturer}
                />
                <Field label="Model" value={model} onChange={setModel} />
              </div>

              <dl className="rounded-lg bg-muted px-4 py-3 text-sm">
                <div className="flex justify-between gap-4 py-1">
                  <dt className="text-muted-foreground">Item</dt>
                  <dd className="truncate font-medium text-foreground">{name.trim()}</dd>
                </div>
                <div className="flex justify-between gap-4 py-1">
                  <dt className="text-muted-foreground">How many</dt>
                  <dd className="font-medium text-foreground">{finalQuantity}</dd>
                </div>
              </dl>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-card px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => (step === 1 ? onClose() : setStep((s) => (s - 1) as Step))}
            disabled={saving}
          >
            {step === 1 ? (
              'Cancel'
            ) : (
              <>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </>
            )}
          </Button>

          {step < 3 ? (
            <Button
              type="button"
              disabled={!canContinue}
              onClick={() => setStep((s) => (s + 1) as Step)}
            >
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : (
            <Button type="button" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Add to All Assets'}
            </Button>
          )}
        </div>

        <div className="border-t border-border px-6 py-2.5 text-center">
          <button
            type="button"
            onClick={onOpenFullForm}
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Need every field? Open the full form
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `qa-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={id}
        value={value}
        placeholder={hint}
        className="mt-1.5"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
