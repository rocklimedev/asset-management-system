import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";

import {
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useGetAssetCategoriesQuery,
  useCreateAssetCategoryMutation,
} from "../../services/api/asset.api";

import { useToastStore } from "../ui/Toast";

import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

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

interface AssetFormValues {
  name: string;
  assetTag: string;
  serialNumber: string;

  kind: AssetKind | "";
  status: AssetStatus | "";
  condition: AssetCondition | "";

  categoryId: string;
  locationId: string;
  vendorId: string;

  manufacturer: string;
  model: string;

  purchaseDate: string;
  purchasePrice: string;

  invoiceNumber: string;
  warrantyStart: string;
  warrantyExpiry: string;

  notes: string;
}

interface CreateAssetModalProps {
  open: boolean;
  onClose: () => void;

  /**
   * If asset is provided, modal works in edit mode.
   */
  asset?: Asset | null;

  /**
   * Optional location options.
   */
  locations?: SelectOption[];

  /**
   * Optional vendor options.
   */
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
  serialNumber: "",

  kind: "",
  status: "",
  condition: "",

  categoryId: "",
  locationId: "",
  vendorId: "",

  manufacturer: "",
  model: "",

  purchaseDate: "",
  purchasePrice: "",

  invoiceNumber: "",
  warrantyStart: "",
  warrantyExpiry: "",

  notes: "",
};

const SELECT_CLASSES =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

const LABEL_CLASSES =
  "mb-1 block text-xs font-medium text-slate-500";

// ============================================================
// HELPERS
// ============================================================

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
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

function assetToFormValues(
  asset: Asset
): AssetFormValues {
  return {
    name: asset.name ?? "",

    assetTag:
      asset.assetTag ?? "",

    serialNumber:
      asset.serialNumber ?? "",

    kind:
      asset.kind ?? "",

    status:
      asset.status ?? "",

    condition:
      asset.condition ?? "",

    categoryId:
      asset.categoryId ?? "",

    locationId:
      asset.locationId ?? "",

    vendorId:
      asset.vendorId ?? "",

    manufacturer:
      asset.manufacturer ?? "",

    model:
      asset.model ?? "",

    purchaseDate:
      asset.purchaseDate
        ? String(asset.purchaseDate).slice(0, 10)
        : "",

    purchasePrice:
      asset.purchasePrice !== undefined &&
      asset.purchasePrice !== null
        ? String(asset.purchasePrice)
        : "",

    invoiceNumber:
      asset.invoiceNumber ?? "",

    warrantyStart:
      asset.warrantyStart
        ? String(asset.warrantyStart).slice(0, 10)
        : "",

    warrantyExpiry:
      asset.warrantyExpiry
        ? String(asset.warrantyExpiry).slice(0, 10)
        : "",

    notes:
      asset.notes ?? "",
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
  vendors = [],
}: CreateAssetModalProps) {
  // ==========================================================
  // MODE
  // ==========================================================

  const isEditMode = Boolean(asset?.id);

  // ==========================================================
  // FORM STATE
  // ==========================================================

  const [values, setValues] =
    useState<AssetFormValues>(EMPTY_FORM);

  const [formError, setFormError] =
    useState<string | null>(null);

  // ==========================================================
  // CATEGORY MODAL STATE
  // ==========================================================

  const [showCategoryModal, setShowCategoryModal] =
    useState(false);

  const [newCategoryName, setNewCategoryName] =
    useState("");

  const [newCategoryDescription, setNewCategoryDescription] =
    useState("");

  const [newCategoryType, setNewCategoryType] =
    useState<AssetKind>("HARDWARE");

  const [categoryError, setCategoryError] =
    useState<string | null>(null);

  // ==========================================================
  // RESET / HYDRATE FORM
  // ==========================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormError(null);

    setValues(
      asset
        ? assetToFormValues(asset)
        : { ...EMPTY_FORM }
    );
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

  const categories =
    categoriesResponse?.data ?? [];

  const [
    createAssetCategory,
    {
      isLoading: isCreatingCategory,
    },
  ] = useCreateAssetCategoryMutation();

  // ==========================================================
  // ASSET API
  // ==========================================================

  const [
    createAsset,
    {
      isLoading: isCreating,
    },
  ] = useCreateAssetMutation();

  const [
    updateAsset,
    {
      isLoading: isUpdating,
    },
  ] = useUpdateAssetMutation();

  const isSubmitting =
    isCreating || isUpdating;

  // ==========================================================
  // TOAST
  // ==========================================================

  const pushToast =
    useToastStore((state) => state.push);

  // ==========================================================
  // FIELD HELPER
  // ==========================================================

  function setField<K extends keyof AssetFormValues>(
    key: K,
    value: AssetFormValues[K]
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  // ==========================================================
  // BUILD CREATE PAYLOAD
  // ==========================================================

  function buildCreatePayload(): CreateAssetRequest {
    return {
      name: values.name.trim(),

      assetTag:
        values.assetTag.trim() || undefined,

      serialNumber:
        values.serialNumber.trim() || undefined,

      kind:
        values.kind || undefined,

      status:
        values.status || undefined,

      condition:
        values.condition || undefined,

      categoryId:
        values.categoryId || undefined,

      locationId:
        values.locationId || undefined,

      vendorId:
        values.vendorId || undefined,

      manufacturer:
        values.manufacturer.trim() || undefined,

      model:
        values.model.trim() || undefined,

      purchaseDate:
        values.purchaseDate || undefined,

      purchasePrice:
        values.purchasePrice.trim()
          ? Number(values.purchasePrice)
          : undefined,

      invoiceNumber:
        values.invoiceNumber.trim() || undefined,

      warrantyStart:
        values.warrantyStart || undefined,

      warrantyExpiry:
        values.warrantyExpiry || undefined,

      notes:
        values.notes.trim() || undefined,
    };
  }

  // ==========================================================
  // BUILD UPDATE PAYLOAD
  // ==========================================================

  function buildUpdatePayload(): UpdateAssetRequest {
    if (!asset?.id) {
      throw new Error(
        "Asset ID is required for update."
      );
    }

    return {
      id: asset.id,

      name: values.name.trim(),

      assetTag:
        values.assetTag.trim() || undefined,

      serialNumber:
        values.serialNumber.trim() || undefined,

      kind:
        values.kind || undefined,

      status:
        values.status || undefined,

      condition:
        values.condition || undefined,

      categoryId:
        values.categoryId || undefined,

      locationId:
        values.locationId || undefined,

      vendorId:
        values.vendorId || undefined,

      manufacturer:
        values.manufacturer.trim() || undefined,

      model:
        values.model.trim() || undefined,

      purchaseDate:
        values.purchaseDate || undefined,

      purchasePrice:
        values.purchasePrice.trim()
          ? Number(values.purchasePrice)
          : undefined,

      invoiceNumber:
        values.invoiceNumber.trim() || undefined,

      warrantyStart:
        values.warrantyStart || undefined,

      warrantyExpiry:
        values.warrantyExpiry || undefined,

      notes:
        values.notes.trim() || undefined,
    };
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

    if (
      values.purchasePrice &&
      Number.isNaN(
        Number(values.purchasePrice)
      )
    ) {
      return "Purchase price must be a valid number.";
    }

    if (
      values.purchasePrice &&
      Number(values.purchasePrice) < 0
    ) {
      return "Purchase price cannot be negative.";
    }

    return null;
  }

  // ==========================================================
  // CREATE CATEGORY
  // ==========================================================

  async function handleCreateCategory(
    event: React.FormEvent
  ) {
    event.preventDefault();

    const name =
      newCategoryName.trim();

    if (!name) {
      setCategoryError(
        "Category name is required."
      );

      return;
    }

    setCategoryError(null);

    try {
      const response =
        await createAssetCategory({
          name,

          description:
            newCategoryDescription.trim() ||
            undefined,

          type:
            newCategoryType,

          isActive: true,
        }).unwrap();

      const createdCategory =
        response.data;

      if (!createdCategory?.id) {
        throw new Error(
          "Category was created but no category ID was returned."
        );
      }

      // Automatically select newly created category.
      setField(
        "categoryId",
        createdCategory.id
      );

      // Reset category form.
      setNewCategoryName("");
      setNewCategoryDescription("");
      setNewCategoryType("HARDWARE");

      setShowCategoryModal(false);

      pushToast(
        `${createdCategory.name} category created.`,
        "success"
      );
    } catch (error) {
      setCategoryError(
        getErrorMessage(
          error,
          "Failed to create category."
        )
      );
    }
  }

  // ==========================================================
  // SUBMIT ASSET
  // ==========================================================

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    const validationError =
      validate();

    if (validationError) {
      setFormError(
        validationError
      );

      return;
    }

    setFormError(null);

    try {
      if (isEditMode) {
        const payload =
          buildUpdatePayload();

        await updateAsset(
          payload
        ).unwrap();

        pushToast(
          `${values.name} updated.`,
          "success"
        );
      } else {
        const payload =
          buildCreatePayload();

        await createAsset(
          payload
        ).unwrap();

        pushToast(
          `${values.name} created.`,
          "success"
        );
      }

      onClose();
    } catch (error) {
      pushToast(
        getErrorMessage(
          error,
          isEditMode
            ? "Failed to update asset."
            : "Failed to create asset."
        ),
        "error"
      );
    }
  }

  // ==========================================================
  // OPEN CATEGORY MODAL
  // ==========================================================

  function openCategoryModal() {
    setCategoryError(null);

    setNewCategoryName("");
    setNewCategoryDescription("");
    setNewCategoryType(
      values.kind === "SOFTWARE"
        ? "SOFTWARE"
        : "HARDWARE"
    );

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
  // RENDER
  // ==========================================================

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">

      {/* ======================================================
          MAIN ASSET MODAL
      ====================================================== */}

      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {isEditMode
                ? "Edit Asset"
                : "Add Asset"}
            </h2>

            <p className="text-xs text-slate-500">
              {isEditMode
                ? "Update the details for this asset."
                : "Add a new asset to the inventory."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ====================================================
            ASSET FORM
        ==================================================== */}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">

            {/* ==================================================
                NAME
            ================================================== */}

            <div className="sm:col-span-2">
              <label className={LABEL_CLASSES}>
                Asset name *
              </label>

              <Input
                value={values.name}
                onChange={(event) =>
                  setField(
                    "name",
                    event.target.value
                  )
                }
                placeholder='e.g. MacBook Pro 14"'
                disabled={isSubmitting}
              />
            </div>

            {/* ==================================================
                ASSET TAG
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Asset tag
              </label>

              <Input
                value={values.assetTag}
                onChange={(event) =>
                  setField(
                    "assetTag",
                    event.target.value
                  )
                }
                placeholder="e.g. AST-0042"
                disabled={isSubmitting}
              />
            </div>

            {/* ==================================================
                SERIAL NUMBER
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Serial number
              </label>

              <Input
                value={values.serialNumber}
                onChange={(event) =>
                  setField(
                    "serialNumber",
                    event.target.value
                  )
                }
                placeholder="Serial number"
                disabled={isSubmitting}
              />
            </div>

            {/* ==================================================
                KIND
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Kind *
              </label>

              <select
                value={values.kind}
                onChange={(event) =>
                  setField(
                    "kind",
                    event.target.value as AssetKind
                  )
                }
                disabled={isSubmitting}
                className={SELECT_CLASSES}
              >
                <option value="">
                  Select kind
                </option>

                {KIND_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* ==================================================
                STATUS
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Status
              </label>

              <select
                value={values.status}
                onChange={(event) =>
                  setField(
                    "status",
                    event.target.value as AssetStatus
                  )
                }
                disabled={isSubmitting}
                className={SELECT_CLASSES}
              >
                <option value="">
                  Select status
                </option>

                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* ==================================================
                CONDITION
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Condition
              </label>

              <select
                value={values.condition}
                onChange={(event) =>
                  setField(
                    "condition",
                    event.target.value as AssetCondition
                  )
                }
                disabled={isSubmitting}
                className={SELECT_CLASSES}
              >
                <option value="">
                  Select condition
                </option>

                {CONDITION_OPTIONS.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* ==================================================
                CATEGORY
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Category *
              </label>

              <div className="flex gap-2">
                <select
                  value={values.categoryId}
                  onChange={(event) =>
                    setField(
                      "categoryId",
                      event.target.value
                    )
                  }
                  disabled={
                    isSubmitting ||
                    isCategoriesLoading
                  }
                  className={`${SELECT_CLASSES} flex-1`}
                >
                  <option value="">
                    {isCategoriesLoading
                      ? "Loading categories..."
                      : "Select category"}
                  </option>

                  {categories.map(
                    (category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    )
                  )}
                </select>

                <button
                  type="button"
                  onClick={openCategoryModal}
                  disabled={isSubmitting}
                  title="Create new category"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {isCategoriesFetching &&
              !isCategoriesLoading ? (
                <p className="mt-1 text-[10px] text-slate-400">
                  Updating categories...
                </p>
              ) : null}
            </div>

            {/* ==================================================
                LOCATION
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Location
              </label>

              {locations.length > 0 ? (
                <select
                  value={values.locationId}
                  onChange={(event) =>
                    setField(
                      "locationId",
                      event.target.value
                    )
                  }
                  disabled={isSubmitting}
                  className={SELECT_CLASSES}
                >
                  <option value="">
                    Select location
                  </option>

                  {locations.map(
                    (location) => (
                      <option
                        key={location.id}
                        value={location.id}
                      >
                        {location.name}
                      </option>
                    )
                  )}
                </select>
              ) : (
                <Input
                  value={values.locationId}
                  onChange={(event) =>
                    setField(
                      "locationId",
                      event.target.value
                    )
                  }
                  placeholder="Location ID"
                  disabled={isSubmitting}
                />
              )}
            </div>

            {/* ==================================================
                VENDOR
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Vendor
              </label>

              {vendors.length > 0 ? (
                <select
                  value={values.vendorId}
                  onChange={(event) =>
                    setField(
                      "vendorId",
                      event.target.value
                    )
                  }
                  disabled={isSubmitting}
                  className={SELECT_CLASSES}
                >
                  <option value="">
                    Select vendor
                  </option>

                  {vendors.map(
                    (vendor) => (
                      <option
                        key={vendor.id}
                        value={vendor.id}
                      >
                        {vendor.name}
                      </option>
                    )
                  )}
                </select>
              ) : (
                <Input
                  value={values.vendorId}
                  onChange={(event) =>
                    setField(
                      "vendorId",
                      event.target.value
                    )
                  }
                  placeholder="Vendor ID"
                  disabled={isSubmitting}
                />
              )}
            </div>

            {/* ==================================================
                MANUFACTURER
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Manufacturer
              </label>

              <Input
                value={values.manufacturer}
                onChange={(event) =>
                  setField(
                    "manufacturer",
                    event.target.value
                  )
                }
                placeholder="e.g. Apple"
                disabled={isSubmitting}
              />
            </div>

            {/* ==================================================
                MODEL
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Model
              </label>

              <Input
                value={values.model}
                onChange={(event) =>
                  setField(
                    "model",
                    event.target.value
                  )
                }
                placeholder="e.g. MacBook Pro"
                disabled={isSubmitting}
              />
            </div>

            {/* ==================================================
                PURCHASE DATE
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Purchase date
              </label>

              <Input
                type="date"
                value={values.purchaseDate}
                onChange={(event) =>
                  setField(
                    "purchaseDate",
                    event.target.value
                  )
                }
                disabled={isSubmitting}
              />
            </div>

            {/* ==================================================
                PURCHASE PRICE
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Purchase price
              </label>

              <Input
                type="number"
                min="0"
                step="0.01"
                value={values.purchasePrice}
                onChange={(event) =>
                  setField(
                    "purchasePrice",
                    event.target.value
                  )
                }
                placeholder="0.00"
                disabled={isSubmitting}
              />
            </div>

            {/* ==================================================
                INVOICE NUMBER
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Invoice number
              </label>

              <Input
                value={values.invoiceNumber}
                onChange={(event) =>
                  setField(
                    "invoiceNumber",
                    event.target.value
                  )
                }
                placeholder="Invoice number"
                disabled={isSubmitting}
              />
            </div>

            {/* ==================================================
                WARRANTY START
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Warranty start
              </label>

              <Input
                type="date"
                value={values.warrantyStart}
                onChange={(event) =>
                  setField(
                    "warrantyStart",
                    event.target.value
                  )
                }
                disabled={isSubmitting}
              />
            </div>

            {/* ==================================================
                WARRANTY EXPIRY
            ================================================== */}

            <div>
              <label className={LABEL_CLASSES}>
                Warranty expiry
              </label>

              <Input
                type="date"
                value={values.warrantyExpiry}
                onChange={(event) =>
                  setField(
                    "warrantyExpiry",
                    event.target.value
                  )
                }
                disabled={isSubmitting}
              />
            </div>

            {/* ==================================================
                NOTES
            ================================================== */}

            <div className="sm:col-span-2">
              <label className={LABEL_CLASSES}>
                Notes
              </label>

              <textarea
                value={values.notes}
                onChange={(event) =>
                  setField(
                    "notes",
                    event.target.value
                  )
                }
                disabled={isSubmitting}
                rows={3}
                placeholder="Additional notes about this asset..."
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>
          </div>

          {/* ====================================================
              FORM ERROR
          ==================================================== */}

          {formError ? (
            <div className="mx-5 mb-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
              {formError}
            </div>
          ) : null}

          {/* ====================================================
              FOOTER
          ==================================================== */}

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
            >
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">

            {/* ==================================================
                CATEGORY HEADER
            ================================================== */}

            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Create Asset Category
                </h3>

                <p className="text-xs text-slate-500">
                  Add a new category for your assets.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCategoryModal}
                disabled={isCreatingCategory}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ==================================================
                CATEGORY FORM
            ================================================== */}

            <form onSubmit={handleCreateCategory}>
              <div className="space-y-4 px-5 py-5">

                {/* Category Name */}

                <div>
                  <label className={LABEL_CLASSES}>
                    Category name *
                  </label>

                  <Input
                    autoFocus
                    value={newCategoryName}
                    onChange={(event) =>
                      setNewCategoryName(
                        event.target.value
                      )
                    }
                    placeholder="e.g. Laptops"
                    disabled={isCreatingCategory}
                  />
                </div>

                {/* Category Type */}

                <div>
                  <label className={LABEL_CLASSES}>
                    Category type *
                  </label>

                  <select
                    value={newCategoryType}
                    onChange={(event) =>
                      setNewCategoryType(
                        event.target.value as AssetKind
                      )
                    }
                    disabled={isCreatingCategory}
                    className={SELECT_CLASSES}
                  >
                    {KIND_OPTIONS.map(
                      (option) => (
                        <option
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* Description */}

                <div>
                  <label className={LABEL_CLASSES}>
                    Description
                  </label>

                  <textarea
                    value={
                      newCategoryDescription
                    }
                    onChange={(event) =>
                      setNewCategoryDescription(
                        event.target.value
                      )
                    }
                    disabled={isCreatingCategory}
                    rows={3}
                    placeholder="Optional description"
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </div>

                {/* Category Error */}

                {categoryError ? (
                  <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                    {categoryError}
                  </div>
                ) : null}
              </div>

              {/* ==================================================
                  CATEGORY FOOTER
              ================================================== */}

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeCategoryModal}
                  disabled={isCreatingCategory}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={isCreatingCategory}
                >
                  {isCreatingCategory
                    ? "Creating..."
                    : "Create category"}
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