import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { BACKEND } from "../../lib/api";
import type {
  Asset,
  AssetAssignment,
  AssetCategory,
  AssetHistoryEntry,
  AssetKind,
  AssetStatus,
  AssetCondition,
  AssignmentStatus,
  PaginatedResponse,
  SystemInput,
  SystemRecord,
  SystemSpecs,
} from "../../types";

// Re-exported so existing imports (e.g. src/types/systems.ts) keep working.
export type { Asset, AssetAssignment, AssetCategory, AssetHistory, AssetKind, AssetStatus, AssetCondition, AssetTrackingMode, SystemRecord, SystemSpecs } from "../../types";

// ============================================================
// ENDPOINT-LEVEL TYPES
// ============================================================

export type AssetUnitStatus = AssetStatus;
export type AssetUnitCondition = AssetCondition;
export type TransferStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED";
export type InventoryChangeType =
  | "RESTOCK"
  | "CONSUMED"
  | "RETURNED"
  | "ADJUSTMENT"
  | "WRITE_OFF";

export interface AssetUnit {
  id: string;
  assetId: string;
  unitCode?: string | null;
  serialNumber?: string | null;
  status: AssetUnitStatus;
  condition: AssetUnitCondition;
  locationId?: string | null;
  location?: { id: string; name: string } | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  asset?: Asset;
  assignments?: AssetAssignment[];
}

export interface AssetPoolItem extends Asset {
  quantityAvailable: number;
}

export interface InventoryHistoryEntry {
  id: string;
  assetId: string;
  changeType: InventoryChangeType;
  quantityDelta: number;
  quantityAfter: number;
  quantityAssignedAfter: number;
  performedBy: string;
  reason?: string | null;
  createdAt: string;
}

export interface AssetResponse {
  data?: Asset;
  message?: string;
}

export type AssetsResponse = PaginatedResponse<Asset>;
export type AssetPoolResponse = PaginatedResponse<AssetPoolItem>;
export type AssetUnitsResponse = PaginatedResponse<AssetUnit>;

export interface GetAssetsParams {
  search?: string;
  organisationId?: string;
  kind?: AssetKind;
  categoryId?: string;
  status?: AssetStatus;
  sortBy?: string;
  sortDir?: "ASC" | "DESC";
  page?: number;
  pageSize?: number;
}

export interface AssetPoolParams {
  search?: string;
  organisationId?: string;
  kind?: AssetKind;
  categoryId?: string;
  locationId?: string;
  page?: number;
  pageSize?: number;
}

export interface GetAssetUnitsParams {
  assetId?: string;
  search?: string;
  status?: AssetUnitStatus;
  condition?: AssetUnitCondition;
  locationId?: string;
  page?: number;
  pageSize?: number;
}

export type AssetInput = Partial<
  Pick<
    Asset,
    | "name"
    | "kind"
    | "assetTag"
    | "manufacturer"
    | "model"
    | "serialNumber"
    | "purchaseDate"
    | "purchasePrice"
    | "warrantyExpiry"
    | "status"
    | "condition"
    | "notes"
    | "trackingMode"
    | "quantity"
    | "organisationId"
    | "vendorId"
    | "invoiceNumber"
    | "warrantyStart"
  > & { categoryId: string; locationId: string | null }
>;

export type CreateAssetRequest = AssetInput & {
  name: string;
  kind: AssetKind;
  categoryId: string;
  initialUnits?: Omit<CreateAssetUnitRequest, "assetId">[];
};
export type UpdateAssetRequest = AssetInput & { id: string };

export interface AssetCategoryInput {
  name: string;
  description?: string | null;
  type: AssetKind;
  organisationId?: string | null;
  isActive?: boolean;
}

export interface CreateAssetUnitRequest {
  assetId: string;
  unitCode?: string | null;
  serialNumber?: string | null;
  status?: AssetUnitStatus;
  condition?: AssetUnitCondition;
  locationId?: string | null;
  notes?: string | null;
}

export interface UpdateAssetUnitRequest {
  id: string;
  unitCode?: string | null;
  serialNumber?: string | null;
  status?: AssetUnitStatus;
  condition?: AssetUnitCondition;
  locationId?: string | null;
  notes?: string | null;
}

export interface AssignAssetRequest {
  id: string;
  employeeId?: string | null;
  systemId?: string;
  assetUnitId?: string;
  notes?: string;
}

export interface ReturnAssetRequest {
  id: string;
  assetUnitId?: string;
  notes?: string;
}

export interface TransferAssetRequest {
  id: string;
  toEmployeeId: string;
  fromSystemId?: string;
  toSystemId?: string;
  reason: string;
  notes?: string;
}

export interface AdjustInventoryRequest {
  id: string;
  changeType: InventoryChangeType;
  quantity: number;
  direction?: "increase" | "decrease";
  reason?: string;
}

// ============================================================
// CONFIG
// Only keepUnusedDataFor is a valid endpoint option. Focus and
// reconnect refetching are hook options or store-level listeners.
// ============================================================

const CACHE_CONFIG = { keepUnusedDataFor: 5 * 60 };
const SHORT_CACHE_CONFIG = { keepUnusedDataFor: 60 };
const LIST_CACHE_CONFIG = { keepUnusedDataFor: 3 * 60 };
const LONG_CACHE_CONFIG = { keepUnusedDataFor: 10 * 60 };

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const toPageSize = (size?: number) =>
  Math.min(size || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

// ============================================================
// ASSET API
// ============================================================

export const assetApi = createApi({
  reducerPath: "assetApi",

  baseQuery: fetchBaseQuery({
    baseUrl: BACKEND,
    timeout: 30000,

    // Do not set Content-Type here. fetchBaseQuery sets it for JSON
    // bodies, and FormData uploads need the browser to set the boundary.
    prepareHeaders: (headers) => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),

  tagTypes: [
    "Asset",
    "AssetHistory",
    "AssetUnit",
    "AssetAssignment",
    "AssetTransfer",
    "AssetCategory",
    "System",
    "SoftwareAsset",
  ],

  endpoints: (builder) => ({
    // ============================================================
    // ASSETS
    // ============================================================

    getAssets: builder.query<AssetsResponse, GetAssetsParams | undefined>({
      query: (params = {}) => ({
        url: "/assets",
        method: "GET",
        params: {
          search: params.search || undefined,
          organisationId: params.organisationId || undefined,
          kind: params.kind || undefined,
          categoryId: params.categoryId || undefined,
          status: params.status || undefined,
          sortBy: params.sortBy || undefined,
          sortDir: params.sortDir || undefined,
          page: params.page || 1,
          pageSize: toPageSize(params.pageSize),
        },
      }),

      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "Asset" as const,
                id,
              })),
              { type: "Asset" as const, id: "LIST" },
            ]
          : [{ type: "Asset" as const, id: "LIST" }],

      ...LIST_CACHE_CONFIG,
    }),

    getAsset: builder.query<AssetResponse, string>({
      query: (id) => ({
        url: `/assets/${id}`,
        method: "GET",
      }),

      providesTags: (result, error, id) => [
        { type: "Asset" as const, id },
        { type: "AssetHistory" as const, id },
      ],

      ...CACHE_CONFIG,
    }),

    createAsset: builder.mutation<AssetResponse, AssetInput>({
      query: (body) => ({
        url: "/assets",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        { type: "Asset", id: "LIST" },
        { type: "Asset", id: "POOL" },
      ],
    }),

    updateAsset: builder.mutation<
      AssetResponse,
      { id: string; body: AssetInput }
    >({
      query: ({ id, body }) => ({
        url: `/assets/${id}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        { type: "Asset", id },
        { type: "Asset", id: "LIST" },
        { type: "Asset", id: "POOL" },
      ],
    }),

    deleteAsset: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/assets/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: (result, error, id) => [
        { type: "Asset", id },
        { type: "Asset", id: "LIST" },
        { type: "Asset", id: "POOL" },
      ],
    }),

    setAssetImage: builder.mutation<AssetResponse, { id: string; file: File }>({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append("file", file);

        return {
          url: `/assets/${id}/image`,
          method: "POST",
          body: formData,
        };
      },

      invalidatesTags: (result, error, { id }) => [
        { type: "Asset", id },
        { type: "Asset", id: "POOL" },
      ],
    }),

    removeAssetImage: builder.mutation<AssetResponse, string>({
      query: (id) => ({
        url: `/assets/${id}/image/remove`,
        method: "POST",
      }),

      invalidatesTags: (result, error, id) => [
        { type: "Asset", id },
        { type: "Asset", id: "POOL" },
      ],
    }),

    getSoftwareAssets: builder.query<Asset[], void>({
      query: () => ({
        url: "/assets",
        method: "GET",
        params: { kind: "SOFTWARE", pageSize: MAX_PAGE_SIZE },
      }),
      transformResponse: (response: AssetsResponse) => response.items,

      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "SoftwareAsset" as const,
                id,
              })),
              { type: "SoftwareAsset" as const, id: "LIST" },
            ]
          : [{ type: "SoftwareAsset" as const, id: "LIST" }],

      ...CACHE_CONFIG,
    }),

    getAssetHistory: builder.query<AssetHistoryEntry[], string>({
      query: (id) => `/assets/${id}/history`,

      providesTags: (result, error, id) => [{ type: "AssetHistory", id }],

      ...SHORT_CACHE_CONFIG,
    }),

    // ============================================================
    // POOL
    // ============================================================

    getAssetPool: builder.query<AssetPoolResponse, AssetPoolParams | undefined>(
      {
        query: (params = {}) => ({
          url: "/assets/pool",
          method: "GET",
          params: {
            search: params.search || undefined,
            organisationId: params.organisationId || undefined,
            kind: params.kind || undefined,
            categoryId: params.categoryId || undefined,
            locationId: params.locationId || undefined,
            page: params.page || 1,
            pageSize: toPageSize(params.pageSize),
          },
        }),

        providesTags: [{ type: "Asset", id: "POOL" }],

        ...LIST_CACHE_CONFIG,
      },
    ),

    // ============================================================
    // ASSIGNMENT / TRANSFER / RETURN
    // ============================================================

    assignAsset: builder.mutation<AssetResponse, AssignAssetRequest>({
      query: ({ id, ...body }) => ({
        url: `/assets/${id}/assign`,
        method: "POST",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        { type: "Asset", id: "POOL" },
        { type: "Asset", id },
        { type: "Asset", id: "LIST" },
        { type: "AssetHistory", id },
        { type: "AssetAssignment", id },
      ],
    }),

    transferAsset: builder.mutation<Asset, TransferAssetRequest>({
      query: ({ id, ...body }) => ({
        url: `/assets/${id}/transfer`,
        method: "POST",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        { type: "Asset", id: "POOL" },
        { type: "Asset", id },
        { type: "Asset", id: "LIST" },
        { type: "AssetHistory", id },
        { type: "AssetTransfer", id },
      ],
    }),

    returnAsset: builder.mutation<AssetResponse, ReturnAssetRequest>({
      query: ({ id, assetUnitId, notes }) => ({
        url: `/assets/${id}/return`,
        method: "POST",
        body: { assetUnitId, notes },
      }),

      invalidatesTags: (result, error, { id, assetUnitId }) => [
        { type: "Asset", id: "POOL" },
        { type: "Asset", id },
        { type: "Asset", id: "LIST" },
        { type: "AssetHistory", id },
        { type: "AssetAssignment", id },
        ...(assetUnitId
          ? [{ type: "AssetUnit" as const, id: assetUnitId }]
          : []),
      ],
    }),

    releaseAssetsForEmployee: builder.mutation<
      { employeeId: string; releasedCount: number },
      string
    >({
      query: (employeeId) => ({
        url: `/assets/release-for-employee/${employeeId}`,
        method: "POST",
      }),

      invalidatesTags: [
        { type: "Asset", id: "LIST" },
        { type: "Asset", id: "POOL" },
        { type: "AssetUnit", id: "LIST" },
        { type: "AssetAssignment", id: "LIST" },
      ],
    }),

    // ============================================================
    // ASSIGNMENT QUERIES
    // ============================================================

    getAssetAssignments: builder.query<AssetAssignment[], void>({
      query: () => "/assets/assignments",

      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "AssetAssignment" as const,
                id,
              })),
              { type: "AssetAssignment" as const, id: "LIST" },
            ]
          : [{ type: "AssetAssignment" as const, id: "LIST" }],

      ...LIST_CACHE_CONFIG,
    }),

    getAssetAssignment: builder.query<AssetAssignment, string>({
      query: (id) => `/assets/assignments/${id}`,

      providesTags: (result, error, id) => [{ type: "AssetAssignment", id }],

      ...CACHE_CONFIG,
    }),

    getAssetAssignmentsByEmployee: builder.query<AssetAssignment[], string>({
      query: (employeeId) => `/employees/${employeeId}/assignments`,

      providesTags: (result, error, employeeId) => [
        { type: "AssetAssignment", id: `employee-${employeeId}` },
      ],

      ...LIST_CACHE_CONFIG,
    }),

    getActiveAssetAssignmentsByEmployee: builder.query<
      AssetAssignment[],
      string
    >({
      query: (employeeId) => `/employees/${employeeId}/assignments/active`,

      providesTags: (result, error, employeeId) => [
        { type: "AssetAssignment", id: `employee-${employeeId}-active` },
      ],

      ...SHORT_CACHE_CONFIG,
    }),

    getAssetAssignmentsByAsset: builder.query<AssetAssignment[], string>({
      query: (assetId) => `/assets/${assetId}/assignments`,

      providesTags: (result, error, assetId) => [
        { type: "AssetAssignment", id: `asset-${assetId}` },
      ],

      ...LIST_CACHE_CONFIG,
    }),

    getActiveAssetAssignmentsByAsset: builder.query<AssetAssignment[], string>({
      query: (assetId) => `/assets/${assetId}/assignments/active`,

      providesTags: (result, error, assetId) => [
        { type: "AssetAssignment", id: `asset-${assetId}-active` },
      ],

      ...SHORT_CACHE_CONFIG,
    }),

    getAssetAssignmentSummary: builder.query<unknown, string>({
      query: (assetId) => `/assets/${assetId}/assignments/summary`,

      providesTags: (result, error, assetId) => [
        { type: "AssetAssignment", id: `asset-${assetId}-summary` },
      ],

      ...SHORT_CACHE_CONFIG,
    }),

    getAssetAssignmentsByAssetUnit: builder.query<AssetAssignment[], string>({
      query: (assetUnitId) => `/assets/units/${assetUnitId}/assignments`,

      providesTags: (result, error, assetUnitId) => [
        { type: "AssetAssignment", id: `unit-${assetUnitId}` },
      ],

      ...LIST_CACHE_CONFIG,
    }),

    getActiveAssetAssignmentByAssetUnit: builder.query<
      AssetAssignment | null,
      string
    >({
      query: (assetUnitId) => `/assets/units/${assetUnitId}/assignments/active`,

      providesTags: (result, error, assetUnitId) => [
        { type: "AssetAssignment", id: `unit-${assetUnitId}-active` },
      ],

      ...SHORT_CACHE_CONFIG,
    }),

    // ============================================================
    // CATEGORIES
    // ============================================================

    getAssetCategories: builder.query<
      AssetCategory[],
      { isActive?: boolean } | void
    >({
      query: (arg) => {
        const params = arg || undefined;
        return {
          url: "/assets/categories",
          method: "GET",
          params:
            params?.isActive === undefined
              ? undefined
              : { isActive: params.isActive },
        };
      },

      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "AssetCategory" as const,
                id,
              })),
              { type: "AssetCategory" as const, id: "LIST" },
            ]
          : [{ type: "AssetCategory" as const, id: "LIST" }],

      ...LONG_CACHE_CONFIG,
    }),

    getAssetCategory: builder.query<AssetCategory, string>({
      query: (id) => `/assets/categories/${id}`,

      providesTags: (result, error, id) => [{ type: "AssetCategory", id }],

      ...CACHE_CONFIG,
    }),

    createAssetCategory: builder.mutation<AssetCategory, AssetCategoryInput>({
      query: (body) => ({
        url: "/assets/categories",
        method: "POST",
        body,
      }),

      invalidatesTags: [{ type: "AssetCategory", id: "LIST" }],
    }),

    updateAssetCategory: builder.mutation<
      AssetCategory,
      { id: string; body: Partial<AssetCategoryInput> }
    >({
      query: ({ id, body }) => ({
        url: `/assets/categories/${id}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        { type: "AssetCategory", id },
        { type: "AssetCategory", id: "LIST" },
      ],
    }),

    toggleAssetCategory: builder.mutation<AssetCategory, string>({
      query: (id) => ({
        url: `/assets/categories/${id}/toggle`,
        method: "PATCH",
      }),

      invalidatesTags: (result, error, id) => [
        { type: "AssetCategory", id },
        { type: "AssetCategory", id: "LIST" },
      ],
    }),

    deleteAssetCategory: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/assets/categories/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: [{ type: "AssetCategory", id: "LIST" }],
    }),

    // ============================================================
    // ASSET UNITS
    // ============================================================

    getAssetUnits: builder.query<
      AssetUnitsResponse,
      GetAssetUnitsParams | undefined
    >({
      query: (params = {}) => ({
        url: "/assets/units",
        method: "GET",
        params: {
          assetId: params.assetId || undefined,
          search: params.search || undefined,
          status: params.status || undefined,
          condition: params.condition || undefined,
          locationId: params.locationId || undefined,
          page: params.page || 1,
          pageSize: toPageSize(params.pageSize),
        },
      }),

      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({
                type: "AssetUnit" as const,
                id,
              })),
              { type: "AssetUnit" as const, id: "LIST" },
            ]
          : [{ type: "AssetUnit" as const, id: "LIST" }],

      ...LIST_CACHE_CONFIG,
    }),

    getAssetUnit: builder.query<AssetUnit, string>({
      query: (id) => `/assets/units/${id}`,

      providesTags: (result, error, id) => [{ type: "AssetUnit", id }],

      ...CACHE_CONFIG,
    }),

    getAssetUnitsByAsset: builder.query<AssetUnit[], string>({
      query: (assetId) => `/assets/${assetId}/units`,

      providesTags: (result, error, assetId) => [
        { type: "AssetUnit", id: `asset-${assetId}` },
      ],

      ...LIST_CACHE_CONFIG,
    }),

    createAssetUnit: builder.mutation<AssetUnit, CreateAssetUnitRequest>({
      query: (body) => ({
        url: "/assets/units",
        method: "POST",
        body,
      }),

      invalidatesTags: (result, error, { assetId }) => [
        { type: "AssetUnit", id: "LIST" },
        { type: "AssetUnit", id: `asset-${assetId}` },
        { type: "Asset", id: assetId },
        { type: "Asset", id: "POOL" },
      ],
    }),

    updateAssetUnit: builder.mutation<AssetUnit, UpdateAssetUnitRequest>({
      query: ({ id, ...body }) => ({
        url: `/assets/units/${id}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        { type: "AssetUnit", id },
        { type: "AssetUnit", id: "LIST" },
      ],
    }),

    updateAssetUnitStatus: builder.mutation<
      AssetUnit,
      { id: string; status: AssetUnitStatus; notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/assets/units/${id}/status`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        { type: "AssetUnit", id },
        { type: "Asset", id: "POOL" },
      ],
    }),

    updateAssetUnitCondition: builder.mutation<
      AssetUnit,
      { id: string; condition: AssetUnitCondition; notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/assets/units/${id}/condition`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [{ type: "AssetUnit", id }],
    }),

    updateAssetUnitLocation: builder.mutation<
      AssetUnit,
      { id: string; locationId?: string; notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/assets/units/${id}/location`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [{ type: "AssetUnit", id }],
    }),

    deleteAssetUnit: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/assets/units/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: (result, error, id) => [
        { type: "AssetUnit", id },
        { type: "AssetUnit", id: "LIST" },
        { type: "Asset", id: "POOL" },
      ],
    }),

    getAssetUnitHistory: builder.query<AssetHistoryEntry[], string>({
      query: (id) => `/assets/units/${id}/history`,

      providesTags: (result, error, id) => [
        { type: "AssetHistory", id: `unit-${id}` },
      ],

      ...CACHE_CONFIG,
    }),

    // ============================================================
    // INVENTORY
    // ============================================================

    adjustInventory: builder.mutation<AssetResponse, AdjustInventoryRequest>({
      query: ({ id, ...body }) => ({
        url: `/assets/${id}/inventory/adjust`,
        method: "POST",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        { type: "Asset", id: "POOL" },
        { type: "Asset", id },
        { type: "Asset", id: "LIST" },
        { type: "AssetHistory", id },
      ],
    }),

    getInventoryHistory: builder.query<InventoryHistoryEntry[], string>({
      query: (id) => `/assets/${id}/inventory/history`,

      providesTags: (result, error, id) => [{ type: "AssetHistory", id }],

      ...LONG_CACHE_CONFIG,
    }),

    // ============================================================
    // SYSTEMS
    // ============================================================

    getSystems: builder.query<SystemRecord[], { search?: string; employeeId?: string; organisationId?: string } | void>({
      query: (params) => ({ url: "/systems", params: params || undefined }),

      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "System" as const,
                id,
              })),
              { type: "System" as const, id: "LIST" },
            ]
          : [{ type: "System" as const, id: "LIST" }],

      ...LIST_CACHE_CONFIG,
    }),

    createSystem: builder.mutation<SystemRecord, SystemInput>({
      query: (body) => ({
        url: "/systems",
        method: "POST",
        body,
      }),

      invalidatesTags: [{ type: "System", id: "LIST" }],
    }),

    updateSystem: builder.mutation<
      SystemRecord,
      { id: string; body: Partial<SystemInput> }
    >({
      query: ({ id, body }) => ({
        url: `/systems/${id}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        { type: "System", id },
        { type: "System", id: "LIST" },
      ],
    }),

    assignSystem: builder.mutation<
      SystemRecord,
      { id: string; employeeId: string | null }
    >({
      query: ({ id, employeeId }) => ({
        url: `/systems/${id}/assign`,
        method: "POST",
        body: { employeeId },
      }),

      invalidatesTags: (result, error, { id }) => [
        { type: "System", id },
        { type: "System", id: "LIST" },
      ],
    }),

    deleteSystem: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/systems/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: (result, error, id) => [
        { type: "System", id },
        { type: "System", id: "LIST" },
      ],
    }),

    getSystemSpecs: builder.query<SystemSpecs, string>({
      query: (systemId) => `/systems/${systemId}/specs`,

      providesTags: (result, error, systemId) => [
        { type: "System", id: `specs-${systemId}` },
      ],

      ...CACHE_CONFIG,
    }),

    upsertSystemSpecs: builder.mutation<
      SystemSpecs,
      { systemId: string; body: Partial<Omit<SystemSpecs, "systemId">> & { cloudStoragePassword?: string } }
    >({
      query: ({ systemId, body }) => ({
        url: `/systems/${systemId}/specs`,
        method: "PUT",
        body,
      }),

      invalidatesTags: (result, error, { systemId }) => [
        { type: "System", id: `specs-${systemId}` },
        { type: "System", id: systemId },
      ],
    }),
  }),
});

// ============================================================
// HOOKS
// ============================================================

export const {
  useGetAssetsQuery,
  useGetAssetQuery,
  useGetAssetHistoryQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
  useRemoveAssetImageMutation,
  useSetAssetImageMutation,
  useGetSoftwareAssetsQuery,
  useGetAssetPoolQuery,
  useAssignAssetMutation,
  useTransferAssetMutation,
  useReturnAssetMutation,
  useReleaseAssetsForEmployeeMutation,
  useGetAssetAssignmentsQuery,
  useGetAssetAssignmentQuery,
  useGetAssetAssignmentsByEmployeeQuery,
  useGetActiveAssetAssignmentsByEmployeeQuery,
  useGetAssetAssignmentsByAssetQuery,
  useGetActiveAssetAssignmentsByAssetQuery,
  useGetAssetAssignmentSummaryQuery,
  useGetAssetAssignmentsByAssetUnitQuery,
  useGetActiveAssetAssignmentByAssetUnitQuery,
  useGetAssetCategoriesQuery,
  useGetAssetCategoryQuery,
  useCreateAssetCategoryMutation,
  useUpdateAssetCategoryMutation,
  useToggleAssetCategoryMutation,
  useDeleteAssetCategoryMutation,
  useGetAssetUnitsQuery,
  useGetAssetUnitQuery,
  useGetAssetUnitsByAssetQuery,
  useCreateAssetUnitMutation,
  useUpdateAssetUnitMutation,
  useUpdateAssetUnitStatusMutation,
  useUpdateAssetUnitConditionMutation,
  useUpdateAssetUnitLocationMutation,
  useDeleteAssetUnitMutation,
  useGetAssetUnitHistoryQuery,
  useAdjustInventoryMutation,
  useGetInventoryHistoryQuery,
  useGetSystemsQuery,
  useCreateSystemMutation,
  useUpdateSystemMutation,
  useAssignSystemMutation,
  useDeleteSystemMutation,
  useGetSystemSpecsQuery,
  useUpsertSystemSpecsMutation,
} = assetApi;

export default assetApi;
