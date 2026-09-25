import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";

import {
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useGetAssetCategoriesQuery,
  useCreateAssetCategoryMutation,
} from "../../services/api/asset.api";

import { toast } from "../ui/toast";

import { Input } from "../ui/input";
import { Button } from "../ui/button";

import type {
  Asset,
  AssetKind,
  AssetStatus,
  AssetCondition,
  CreateAssetRequest,
  UpdateAssetRequest,
} from "../../services/api/asset.api";

// ============================================================
// TYPES
// ============================================================

interface SelectOption {
  id: string;
  name: string;
}

interface ApiError {
  data?: {
    message?: string;
    error?: string;
  };
  message?: string;
}

type AssetTrackingMode = "INDIVIDUAL" | "QUANTITY";

interface AssetUnitForm {
  id?: string;
  unitCode: string;
  serialNumber: string;
  status: AssetStatus;
  condition: AssetCondition;
  locationId: string;
  notes: string;
}

interface AssetFormValues {
  name: string;
  assetTag: string;

  kind: AssetKind | "";
  trackingMode: AssetTrackingMode;

  status: AssetStatus | "";
  condition: AssetCondition | "";

  categoryId: string;

  manufacturer: string;
  model: string;

  quantity: number;

  purchaseDate: string;

  invoiceNumber: string;

  warrantyExpiry: string;

  notes: string;
}

interface CreateAssetModalProps {
  open: boolean;
  onClose: () => void;

  asset?: Asset | null;

  locations?: SelectOption[];

  vendors?: SelectOption[];
}

// ============================================================
// CONSTANTS
// ============================================================

const KIND_OPTIONS: {
  value: AssetKind;
  label: string;
}[] = [
  {
    value: "HARDWARE",
    label: "Hardware",
  },
  {
    value: "SOFTWARE",
    label: "Software",
  },
];

const TRACKING_MODE_OPTIONS: {
  value: AssetTrackingMode;
  label: string;
  description: string;
}[] = [
  {
    value: "INDIVIDUAL",
    label: "Individual",
    description: "Track each asset as a separate unit.",
  },
  {
    value: "QUANTITY",
    label: "Quantity",
    description: "Track multiple units under one asset record.",
  },
];

const STATUS_OPTIONS: {
  value: AssetStatus;
  label: string;
}[] = [
  {
    value: "AVAILABLE",
    label: "Available",
  },
  {
    value: "ASSIGNED",
    label: "Assigned",
  },
  {
    value: "REPAIR",
    label: "Repair",
  },
  {
    value: "LOST",
    label: "Lost",
  },
  {
    value: "DAMAGED",
    label: "Damaged",
  },
  {
    value: "RETIRED",
    label: "Retired",
  },
  {
    value: "DISPOSED",
    label: "Disposed",
  },
];

const CONDITION_OPTIONS: {
  value: AssetCondition;
  label: string;
}[] = [
  {
    value: "NEW",
    label: "New",
  },
  {
    value: "GOOD",
    label: "Good",
  },
  {
    value: "FAIR",
    label: "Fair",
  },
  {
    value: "POOR",
    label: "Poor",
  },
];

const EMPTY_FORM: AssetFormValues = {
  name: "",
  assetTag: "",

  kind: "",
  trackingMode: "QUANTITY",

  status: "AVAILABLE",
  condition: "GOOD",

  categoryId: "",

  manufacturer: "",
  model: "",

  quantity: 1,

  purchaseDate: "",

  invoiceNumber: "",

  warrantyExpiry: "",

  notes: "",
};

const SELECT_CLASSES =
  "h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground";

const LABEL_CLASSES = "mb-1 block text-xs font-medium text-muted-foreground";

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

function createEmptyUnit(
  index: number,
  defaults?: {
    status?: AssetStatus;
    condition?: AssetCondition;
  },
): AssetUnitForm {
  return {
    unitCode: `UNIT-${String(index + 1).padStart(3, "0")}`,
    serialNumber: "",
    status: defaults?.status ?? "AVAILABLE",
    condition: defaults?.condition ?? "GOOD",
    locationId: "",
    notes: "",
  };
}

function createUnits(
  quantity: number,
  status: AssetStatus,
  condition: AssetCondition,
): AssetUnitForm[] {
  const safeQuantity = Math.max(1, Math.floor(quantity || 1));

  return Array.from({ length: safeQuantity }, (_, index) =>
    createEmptyUnit(index, {
      status,
      condition,
    }),
  );
}

function assetToFormValues(asset: Asset): AssetFormValues {
  const trackingMode = ((asset as Asset & { trackingMode?: AssetTrackingMode })
    .trackingMode ?? "QUANTITY") as AssetTrackingMode;

  return {
    name: asset.name ?? "",

    assetTag: asset.assetTag ?? "",

    kind: asset.kind ?? "",

    trackingMode,

    status: asset.status ?? "AVAILABLE",

    condition: asset.condition ?? "GOOD",

    categoryId: asset.categoryId ?? "",

    manufacturer: asset.manufacturer ?? "",

    model: asset.model ?? "",

    quantity: Math.max(1, Number(asset.quantity ?? 1)),

    purchaseDate: asset.purchaseDate
      ? String(asset.purchaseDate).slice(0, 10)
      : "",

    invoiceNumber: asset.invoiceNumber ?? "",

    warrantyExpiry: asset.warrantyExpiry
      ? String(asset.warrantyExpiry).slice(0, 10)
      : "",

    notes: asset.notes ?? "",
  };
}

// ============================================================
// COMPONENT
// ============================================================

export function CreateAssetModal({
  open,
  onClose,
  asset,
  locations = [],
}: CreateAssetModalProps) {
  const isEditMode = Boolean(asset?.id);

  // ==========================================================
  // FORM STATE
  // ==========================================================

  const [values, setValues] = useState<AssetFormValues>(EMPTY_FORM);

  const [units, setUnits] = useState<AssetUnitForm[]>([]);

  const [formError, setFormError] = useState<string | null>(null);

  // ==========================================================
  // CATEGORY MODAL STATE
  // ==========================================================

  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [newCategoryName, setNewCategoryName] = useState("");

  const [newCategoryDescription, setNewCategoryDescription] = useState("");

  const [newCategoryType, setNewCategoryType] = useState<AssetKind>("HARDWARE");

  const [categoryError, setCategoryError] = useState<string | null>(null);

  // ==========================================================
  // RESET / HYDRATE FORM
  // ==========================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormError(null);

    const nextValues = asset ? assetToFormValues(asset) : { ...EMPTY_FORM };

    setValues(nextValues);

    const existingUnits =
      (
        asset as
          | (Asset & {
              units?: AssetUnitForm[];
            })
          | null
          | undefined
      )?.units ?? [];

    if (existingUnits.length > 0) {
      setUnits(
        existingUnits.map((unit, index) => ({
          id: unit.id,
          unitCode:
            unit.unitCode || `UNIT-${String(index + 1).padStart(3, "0")}`,
          serialNumber: unit.serialNumber ?? "",
          status: unit.status ?? nextValues.status ?? "AVAILABLE",
          condition: unit.condition ?? nextValues.condition ?? "GOOD",
          locationId: unit.locationId ?? "",
          notes: unit.notes ?? "",
        })),
      );
    } else {
      setUnits(
        createUnits(
          nextValues.trackingMode === "INDIVIDUAL" ? 1 : nextValues.quantity,
          (nextValues.status || "AVAILABLE") as AssetStatus,
          (nextValues.condition || "GOOD") as AssetCondition,
        ),
      );
    }
  }, [open, asset]);

  // ==========================================================
  // CATEGORY API
  // ==========================================================

  const {
    data: categoriesResponse,
    isLoading: isCategoriesLoading,
    isFetching: isCategoriesFetching,
  } = useGetAssetCategoriesQuery({
    isActive: true,
  });

  const categories = categoriesResponse ?? [];

  const [createAssetCategory, { isLoading: isCreatingCategory }] =
    useCreateAssetCategoryMutation();

  // ==========================================================
  // ASSET API
  // ==========================================================

  const [createAsset, { isLoading: isCreating }] = useCreateAssetMutation();

  const [updateAsset, { isLoading: isUpdating }] = useUpdateAssetMutation();

  const isSubmitting = isCreating || isUpdating;

  // ==========================================================
  // FIELD HELPER
  // ==========================================================

  function setField<K extends keyof AssetFormValues>(
    key: K,
    value: AssetFormValues[K],
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  // ==========================================================
  // TRACKING MODE
  // ==========================================================

  function handleTrackingModeChange(trackingMode: AssetTrackingMode) {
    setField("trackingMode", trackingMode);

    const quantity =
      trackingMode === "INDIVIDUAL" ? 1 : Math.max(1, values.quantity || 1);

    setField("quantity", quantity);

    setUnits(
      createUnits(
        quantity,
        (values.status || "AVAILABLE") as AssetStatus,
        (values.condition || "GOOD") as AssetCondition,
      ),
    );
  }

  // ==========================================================
  // QUANTITY
  // ==========================================================

  function handleQuantityChange(value: string) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return;
    }

    const quantity = Math.max(1, Math.floor(parsed));

    setField("quantity", quantity);

    if (values.trackingMode !== "QUANTITY") {
      return;
    }

    setUnits((current) => {
      if (quantity === current.length) {
        return current;
      }

      if (quantity < current.length) {
        return current.slice(0, quantity);
      }

      const additionalUnits = Array.from(
        {
          length: quantity - current.length,
        },
        (_, index) =>
          createEmptyUnit(current.length + index, {
            status: (values.status || "AVAILABLE") as AssetStatus,
            condition: (values.condition || "GOOD") as AssetCondition,
          }),
      );

      return [...current, ...additionalUnits];
    });
  }

  // ==========================================================
  // UNIT HELPERS
  // ==========================================================

  function updateUnit(index: number, key: keyof AssetUnitForm, value: string) {
    setUnits((current) =>
      current.map((unit, unitIndex) =>
        unitIndex === index
          ? {
              ...unit,
              [key]: value,
            }
          : unit,
      ),
    );
  }

  function regenerateUnitCodes() {
    setUnits((current) =>
      current.map((unit, index) => ({
        ...unit,
        unitCode: unit.unitCode || `UNIT-${String(index + 1).padStart(3, "0")}`,
      })),
    );
  }

  // ==========================================================
  // BUILD CREATE PAYLOAD
  // ==========================================================

  function buildCreatePayload(): CreateAssetRequest {
    if (!values.kind) {
      throw new Error("Asset kind is required.");
    }

    if (!values.categoryId) {
      throw new Error("Asset category is required.");
    }

    if (values.trackingMode === "INDIVIDUAL" && units.length !== 1) {
      throw new Error("Individual assets must have exactly one unit record.");
    }

    if (
      values.trackingMode === "QUANTITY" &&
      units.length !== values.quantity
    ) {
      throw new Error("Unit records must match the asset quantity.");
    }

    const normalizedUnits = units.map((unit, index) => ({
      unitCode: unit.unitCode.trim() || undefined,
      serialNumber: unit.serialNumber.trim() || undefined,
      status: unit.status || "AVAILABLE",
      condition: unit.condition || "GOOD",
      locationId: unit.locationId || undefined,
      notes: unit.notes.trim() || undefined,
    }));

    return {
      name: values.name.trim(),

      assetTag: values.assetTag.trim() || undefined,

      kind: values.kind,

      trackingMode: values.trackingMode,

      quantity: values.trackingMode === "INDIVIDUAL" ? 1 : values.quantity,

      status: values.status || undefined,

      condition: values.condition || undefined,

      categoryId: values.categoryId,

      manufacturer: values.manufacturer.trim() || undefined,

      model: values.model.trim() || undefined,

      purchaseDate: values.purchaseDate || undefined,

      invoiceNumber: values.invoiceNumber.trim() || undefined,

      warrantyExpiry: values.warrantyExpiry || undefined,

      notes: values.notes.trim() || undefined,

      units: normalizedUnits,
    } as CreateAssetRequest;
  }

  // ==========================================================
  // BUILD UPDATE PAYLOAD
  // ==========================================================

  function buildUpdatePayload(): UpdateAssetRequest {
    if (!asset?.id) {
      throw new Error("Asset ID is required for update.");
    }

    return {
      id: asset.id,

      name: values.name.trim(),

      assetTag: values.assetTag.trim() || undefined,

      kind: values.kind || undefined,

      trackingMode: values.trackingMode,

      quantity: values.trackingMode === "INDIVIDUAL" ? 1 : values.quantity,

      status: values.status || undefined,

      condition: values.condition || undefined,

      categoryId: values.categoryId || undefined,

      manufacturer: values.manufacturer.trim() || undefined,

      model: values.model.trim() || undefined,

      purchaseDate: values.purchaseDate || undefined,

      invoiceNumber: values.invoiceNumber.trim() || undefined,

      warrantyExpiry: values.warrantyExpiry || undefined,

      notes: values.notes.trim() || undefined,
    } as UpdateAssetRequest;
  }

  // ==========================================================
  // VALIDATION
  // ==========================================================

  function validate(): string | null {
    if (!values.name.trim()) {
      return "Asset name is required.";
    }

    if (!values.kind) {
      return "Please select an asset kind.";
    }

    if (!values.categoryId) {
      return "Please select a category.";
    }

    if (!Number.isInteger(values.quantity) || values.quantity < 1) {
      return "Quantity must be at least 1.";
    }

    if (values.trackingMode === "INDIVIDUAL" && units.length !== 1) {
      return "Individual assets must have one unit record.";
    }

    if (
      values.trackingMode === "QUANTITY" &&
      units.length !== values.quantity
    ) {
      return `Please provide ${values.quantity} unit records.`;
    }

    for (let index = 0; index < units.length; index += 1) {
      const unit = units[index];

      if (!unit.unitCode.trim()) {
        return `Unit ${index + 1}: unit code is required.`;
      }
    }

    return null;
  }

  // ==========================================================
  // CREATE CATEGORY
  // ==========================================================

  async function handleCreateCategory(event: React.FormEvent) {
    event.preventDefault();

    const name = newCategoryName.trim();

    if (!name) {
      setCategoryError("Category name is required.");
      return;
    }

    setCategoryError(null);

    try {
      const response = await createAssetCategory({
        name,

        description: newCategoryDescription.trim() || undefined,

        type: newCategoryType,

        isActive: true,
      }).unwrap();

      const createdCategory = response.data;

      if (!createdCategory?.id) {
        throw new Error(
          "Category was created but no category ID was returned.",
        );
      }

      setField("categoryId", createdCategory.id);

      setNewCategoryName("");
      setNewCategoryDescription("");
      setNewCategoryType("HARDWARE");

      setShowCategoryModal(false);

      toast.add({
        title: "Category created",
        description: `${createdCategory.name} category created.`,
        type: "success",
      });
    } catch (error) {
      setCategoryError(getErrorMessage(error, "Failed to create category."));
    }
  }

  // ==========================================================
  // SUBMIT ASSET
  // ==========================================================

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);

    try {
      if (isEditMode) {
        const payload = buildUpdatePayload();

        await updateAsset(payload).unwrap();

        toast.add({
          title: "Asset updated",
          description: `${values.name} updated.`,
          type: "success",
        });
      } else {
        const payload = buildCreatePayload();

        await createAsset(payload).unwrap();

        toast.add({
          title: "Asset created",
          description: `${values.name} created with ${units.length} unit record${
            units.length === 1 ? "" : "s"
          }.`,
          type: "success",
        });
      }

      onClose();
    } catch (error) {
      toast.add({
        title: isEditMode ? "Update failed" : "Creation failed",
        description: getErrorMessage(
          error,
          isEditMode ? "Failed to update asset." : "Failed to create asset.",
        ),
        type: "error",
      });
    }
  }

  // ==========================================================
  // OPEN CATEGORY MODAL
  // ==========================================================

  function openCategoryModal() {
    setCategoryError(null);

    setNewCategoryName("");
    setNewCategoryDescription("");

    setNewCategoryType(values.kind === "SOFTWARE" ? "SOFTWARE" : "HARDWARE");

    setShowCategoryModal(true);
  }

  // ==========================================================
  // CLOSE CATEGORY MODAL
  // ==========================================================

  function closeCategoryModal() {
    if (isCreatingCategory) {
      return;
    }

    setShowCategoryModal(false);
    setCategoryError(null);
  }

  // ==========================================================
  // UNIT SUMMARY
  // ==========================================================

  const unitSummary = useMemo(() => {
    const available = units.filter(
      (unit) => unit.status === "AVAILABLE",
    ).length;

    const assigned = units.filter((unit) => unit.status === "ASSIGNED").length;

    const repair = units.filter((unit) => unit.status === "REPAIR").length;

    return {
      total: units.length,
      available,
      assigned,
      repair,
    };
  }, [units]);

  // ==========================================================
  // RENDER
  // ==========================================================

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim px-4">
      {/* ======================================================
          MAIN ASSET MODAL
      ====================================================== */}

      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-card shadow-xl">
        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {isEditMode ? "Edit Asset" : "Add Asset"}
            </h2>

            <p className="text-xs text-muted-foreground">
              {isEditMode
                ? "Update the asset details."
                : "Add a new asset and its unit records."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ====================================================
            ASSET FORM
        ==================================================== */}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
            {/* NAME */}

            <div className="sm:col-span-2">
              <label className={LABEL_CLASSES}>Asset name *</label>

              <Input
                value={values.name}
                onChange={(event) => setField("name", event.target.value)}
                placeholder='e.g. MacBook Pro 14"'
                disabled={isSubmitting}
              />
            </div>

            {/* ASSET TAG */}

            <div>
              <label className={LABEL_CLASSES}>Asset tag</label>

              <Input
                value={values.assetTag}
                onChange={(event) => setField("assetTag", event.target.value)}
                placeholder="e.g. AST-0042"
                disabled={isSubmitting}
              />
            </div>

            {/* KIND */}

            <div>
              <label className={LABEL_CLASSES}>Kind *</label>

              <select
                value={values.kind}
                onChange={(event) =>
                  setField("kind", event.target.value as AssetKind)
                }
                disabled={isSubmitting}
                className={SELECT_CLASSES}
              >
                <option value="">Select kind</option>

                {KIND_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* TRACKING MODE */}

            <div className="sm:col-span-2">
              <label className={LABEL_CLASSES}>Tracking mode *</label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {TRACKING_MODE_OPTIONS.map((option) => {
                  const selected = values.trackingMode === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleTrackingModeChange(option.value)}
                      disabled={isSubmitting}
                      className={[
                        "rounded-md border p-3 text-left transition",
                        selected
                          ? "border-ring bg-muted"
                          : "border-border hover:bg-muted/50",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "h-3 w-3 rounded-full border",
                            selected
                              ? "border-foreground bg-foreground"
                              : "border-muted-foreground",
                          ].join(" ")}
                        />

                        <span className="text-sm font-medium text-foreground">
                          {option.label}
                        </span>
                      </div>

                      <p className="mt-1 pl-5 text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* QUANTITY */}

            <div>
              <label className={LABEL_CLASSES}>Quantity *</label>

              <Input
                type="number"
                min={1}
                step={1}
                value={values.quantity}
                onChange={(event) => handleQuantityChange(event.target.value)}
                disabled={isSubmitting || values.trackingMode === "INDIVIDUAL"}
              />

              {values.trackingMode === "INDIVIDUAL" ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Individual assets always have quantity 1.
                </p>
              ) : (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {values.quantity} unit record
                  {values.quantity === 1 ? "" : "s"} will be created.
                </p>
              )}
            </div>

            {/* STATUS */}

            <div>
              <label className={LABEL_CLASSES}>Default status</label>

              <select
                value={values.status}
                onChange={(event) => {
                  const status = event.target.value as AssetStatus;

                  setField("status", status);

                  setUnits((current) =>
                    current.map((unit) => ({
                      ...unit,
                      status,
                    })),
                  );
                }}
                disabled={isSubmitting}
                className={SELECT_CLASSES}
              >
                <option value="">Select status</option>

                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* CONDITION */}

            <div>
              <label className={LABEL_CLASSES}>Default condition</label>

              <select
                value={values.condition}
                onChange={(event) => {
                  const condition = event.target.value as AssetCondition;

                  setField("condition", condition);

                  setUnits((current) =>
                    current.map((unit) => ({
                      ...unit,
                      condition,
                    })),
                  );
                }}
                disabled={isSubmitting}
                className={SELECT_CLASSES}
              >
                <option value="">Select condition</option>

                {CONDITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* CATEGORY */}

            <div>
              <label className={LABEL_CLASSES}>Category *</label>

              <div className="flex gap-2">
                <select
                  value={values.categoryId}
                  onChange={(event) =>
                    setField("categoryId", event.target.value)
                  }
                  disabled={isSubmitting || isCategoriesLoading}
                  className={`${SELECT_CLASSES} flex-1`}
                >
                  <option value="">
                    {isCategoriesLoading
                      ? "Loading categories..."
                      : "Select category"}
                  </option>

                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={openCategoryModal}
                  disabled={isSubmitting}
                  title="Create new category"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:border-input hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {isCategoriesFetching && !isCategoriesLoading ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Updating categories...
                </p>
              ) : null}
            </div>

            {/* MANUFACTURER */}

            <div>
              <label className={LABEL_CLASSES}>Manufacturer</label>

              <Input
                value={values.manufacturer}
                onChange={(event) =>
                  setField("manufacturer", event.target.value)
                }
                placeholder="e.g. Apple"
                disabled={isSubmitting}
              />
            </div>

            {/* MODEL */}

            <div>
              <label className={LABEL_CLASSES}>Model</label>

              <Input
                value={values.model}
                onChange={(event) => setField("model", event.target.value)}
                placeholder="e.g. MacBook Pro"
                disabled={isSubmitting}
              />
            </div>

            {/* PURCHASE DATE */}

            <div>
              <label className={LABEL_CLASSES}>Purchase date</label>

              <Input
                type="date"
                value={values.purchaseDate}
                onChange={(event) =>
                  setField("purchaseDate", event.target.value)
                }
                disabled={isSubmitting}
              />
            </div>

            {/* INVOICE NUMBER */}

            <div>
              <label className={LABEL_CLASSES}>Invoice number</label>

              <Input
                value={values.invoiceNumber}
                onChange={(event) =>
                  setField("invoiceNumber", event.target.value)
                }
                placeholder="Invoice number"
                disabled={isSubmitting}
              />
            </div>

            {/* WARRANTY EXPIRY */}

            <div>
              <label className={LABEL_CLASSES}>Warranty expiry</label>

              <Input
                type="date"
                value={values.warrantyExpiry}
                onChange={(event) =>
                  setField("warrantyExpiry", event.target.value)
                }
                disabled={isSubmitting}
              />
            </div>

            {/* NOTES */}

            <div className="sm:col-span-2">
              <label className={LABEL_CLASSES}>Notes</label>

              <textarea
                value={values.notes}
                onChange={(event) => setField("notes", event.target.value)}
                disabled={isSubmitting}
                rows={3}
                placeholder="Additional notes about this asset..."
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring disabled:cursor-not-allowed disabled:bg-muted"
              />
            </div>
          </div>

          {/* ====================================================
              UNIT RECORDS
          ==================================================== */}

          <div className="border-t border-border px-5 py-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Unit Records
                </h3>

                <p className="text-xs text-muted-foreground">
                  {values.trackingMode === "INDIVIDUAL"
                    ? "This asset has one individually tracked unit."
                    : "Each quantity has its own unit record."}
                </p>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>
                  Total:{" "}
                  <strong className="text-foreground">
                    {unitSummary.total}
                  </strong>
                </span>

                <span>
                  Available:{" "}
                  <strong className="text-foreground">
                    {unitSummary.available}
                  </strong>
                </span>

                <span>
                  Assigned:{" "}
                  <strong className="text-foreground">
                    {unitSummary.assigned}
                  </strong>
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {units.map((unit, index) => (
                <div
                  key={unit.id ?? index}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Unit {index + 1}
                      </p>

                      <p className="text-[10px] text-muted-foreground">
                        Individual unit information
                      </p>
                    </div>

                    {values.trackingMode === "QUANTITY" && units.length > 1 ? (
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground">
                        {index + 1} / {units.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {/* UNIT CODE */}

                    <div>
                      <label className={LABEL_CLASSES}>Unit code *</label>

                      <Input
                        value={unit.unitCode}
                        onChange={(event) =>
                          updateUnit(index, "unitCode", event.target.value)
                        }
                        placeholder={`UNIT-${String(index + 1).padStart(
                          3,
                          "0",
                        )}`}
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* SERIAL */}

                    <div>
                      <label className={LABEL_CLASSES}>Serial number</label>

                      <Input
                        value={unit.serialNumber}
                        onChange={(event) =>
                          updateUnit(index, "serialNumber", event.target.value)
                        }
                        placeholder="Serial number"
                        disabled={isSubmitting}
                      />
                    </div>

                    {/* STATUS */}

                    <div>
                      <label className={LABEL_CLASSES}>Status</label>

                      <select
                        value={unit.status}
                        onChange={(event) =>
                          updateUnit(index, "status", event.target.value)
                        }
                        disabled={isSubmitting}
                        className={SELECT_CLASSES}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CONDITION */}

                    <div>
                      <label className={LABEL_CLASSES}>Condition</label>

                      <select
                        value={unit.condition}
                        onChange={(event) =>
                          updateUnit(index, "condition", event.target.value)
                        }
                        disabled={isSubmitting}
                        className={SELECT_CLASSES}
                      >
                        {CONDITION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* LOCATION */}

                    <div>
                      <label className={LABEL_CLASSES}>Location</label>

                      <select
                        value={unit.locationId}
                        onChange={(event) =>
                          updateUnit(index, "locationId", event.target.value)
                        }
                        disabled={isSubmitting || locations.length === 0}
                        className={SELECT_CLASSES}
                      >
                        <option value="">
                          {locations.length
                            ? "Select location"
                            : "No locations available"}
                        </option>

                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* NOTES */}

                    <div>
                      <label className={LABEL_CLASSES}>Notes</label>

                      <Input
                        value={unit.notes}
                        onChange={(event) =>
                          updateUnit(index, "notes", event.target.value)
                        }
                        placeholder="Unit notes"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {values.trackingMode === "QUANTITY" ? (
              <div className="mt-3 flex items-center justify-between rounded-md bg-muted px-3 py-2">
                <p className="text-[10px] text-muted-foreground">
                  Unit records automatically match the quantity.
                </p>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={regenerateUnitCodes}
                  disabled={isSubmitting}
                >
                  Generate missing codes
                </Button>
              </div>
            ) : null}
          </div>

          {/* ====================================================
              FORM ERROR
          ==================================================== */}

          {formError ? (
            <div className="mx-5 mb-4 rounded-md bg-destructive-muted px-3 py-2 text-xs text-destructive-strong">
              {formError}
            </div>
          ) : null}

          {/* ====================================================
              FOOTER
          ==================================================== */}

          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode
                  ? "Saving..."
                  : "Creating..."
                : isEditMode
                  ? "Save changes"
                  : "Create asset"}
            </Button>
          </div>
        </form>
      </div>

      {/* ======================================================
          CREATE CATEGORY MODAL
      ====================================================== */}

      {showCategoryModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim px-4">
          <div className="w-full max-w-md rounded-lg bg-card shadow-xl">
            {/* CATEGORY HEADER */}

            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Create Asset Category
                </h3>

                <p className="text-xs text-muted-foreground">
                  Add a new category for your assets.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCategoryModal}
                disabled={isCreatingCategory}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* CATEGORY FORM */}

            <form onSubmit={handleCreateCategory}>
              <div className="space-y-4 px-5 py-5">
                {/* CATEGORY NAME */}

                <div>
                  <label className={LABEL_CLASSES}>Category name *</label>

                  <Input
                    autoFocus
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="e.g. Laptops"
                    disabled={isCreatingCategory}
                  />
                </div>

                {/* CATEGORY TYPE */}

                <div>
                  <label className={LABEL_CLASSES}>Category type *</label>

                  <select
                    value={newCategoryType}
                    onChange={(event) =>
                      setNewCategoryType(event.target.value as AssetKind)
                    }
                    disabled={isCreatingCategory}
                    className={SELECT_CLASSES}
                  >
                    {KIND_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DESCRIPTION */}

                <div>
                  <label className={LABEL_CLASSES}>Description</label>

                  <textarea
                    value={newCategoryDescription}
                    onChange={(event) =>
                      setNewCategoryDescription(event.target.value)
                    }
                    disabled={isCreatingCategory}
                    rows={3}
                    placeholder="Optional description"
                    className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-ring disabled:cursor-not-allowed disabled:bg-muted"
                  />
                </div>

                {/* CATEGORY ERROR */}

                {categoryError ? (
                  <div className="rounded-md bg-destructive-muted px-3 py-2 text-xs text-destructive-strong">
                    {categoryError}
                  </div>
                ) : null}
              </div>

              {/* CATEGORY FOOTER */}

              <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeCategoryModal}
                  disabled={isCreatingCategory}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isCreatingCategory}>
                  {isCreatingCategory ? "Creating..." : "Create category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CreateAssetModal;
