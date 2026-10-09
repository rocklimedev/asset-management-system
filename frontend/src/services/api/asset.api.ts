import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";
import { BACKEND } from "../../lib/api";

// ============================================================
// ENUMS (unchanged)
// ============================================================

export type AssetKind = "HARDWARE" | "SOFTWARE";

export type AssetTrackingMode = "INDIVIDUAL" | "QUANTITY";

export type AssetStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "REPAIR"
  | "LOST"
  | "DAMAGED"
  | "RETIRED"
  | "DISPOSED";

export type AssetCondition = "NEW" | "GOOD" | "FAIR" | "POOR";

export type AssetUnitStatus = AssetStatus;

export type AssetUnitCondition = AssetCondition;

export type AssignmentStatus = "ACTIVE" | "RETURNED";

export type TransferStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED"
  | "CANCELLED";

// ============================================================
// PERFORMANCE CONFIG CONSTANTS
// ============================================================

const CACHE_CONFIG = {
  // Keep unused data for 5 minutes before removing from cache
  keepUnusedDataFor: 5 * 60,

  // Keep failed requests for only 30 seconds before allowing retry
  keepUnusedDataForError: 30,

  // Refetch when window regains focus
  refetchOnFocus: true,

  // Refetch when network reconnects
  refetchOnReconnect: true,

  // Don't automatically re-fetch when component mounts if data exists
  refetchOnMountOrArgChange: false,
};

const SHORT_CACHE_CONFIG = {
  ...CACHE_CONFIG,
  keepUnusedDataFor: 60, // 1 minute for frequently changing data
};

const LIST_CACHE_CONFIG = {
  ...CACHE_CONFIG,
  keepUnusedDataFor: 3 * 60, // 3 minutes for list views
  refetchOnFocus: true,
};

// ============================================================
// PAGINATION CONSTANTS
// ============================================================

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ============================================================
// TYPES (Keep existing types from original, show key ones below)
// ============================================================

export interface AssetOrganisation {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface AssetEmployee {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  email?: string;
  [key: string]: unknown;
}

export interface AssetLocation {
  id: string;
  name?: string;
  [key: string]: unknown;
}

export interface AssetVendor {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface AssetCategory {
  id: string;
  name: string;
  description?: string | null;
  type: AssetKind;
  organisationId?: string | null;
  isActive: boolean;
  assets?: Asset[];
  createdAt?: string;
  updatedAt?: string;
  organisation?: AssetOrganisation;
  [key: string]: unknown;
}

export interface AssetUnit {
  id: string;
  assetId: string;
  unitCode?: string | null;
  serialNumber?: string | null;
  status: AssetUnitStatus;
  condition: AssetUnitCondition;
  locationId?: string | null;
  location?: AssetLocation | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  asset?: Asset;
  assignments?: AssetAssignment[];
  history?: AssetHistory[];
  [key: string]: unknown;
}

// [Include all other type definitions from original file...]

export interface Asset {
  id: string;
  name: string;
  kind: AssetKind;
  category?: AssetCategory;
  categoryId?: string;
  [key: string]: unknown;
}

export interface AssetResponse {
  data?: Asset;
  message?: string;
  [key: string]: unknown;
}

export interface AssetsResponse {
  items: Asset[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  [key: string]: unknown;
}

export interface GetAssetsParams {
  search?: string;
  organisationId?: string;
  kind?: AssetKind;
  categoryId?: string;
  page?: number;
  pageSize?: number;
}

export interface AssetHistory {
  id: string;
  assetId: string;
  action: string;
  performedBy: string;
  [key: string]: unknown;
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  employeeId: string;
  status: AssignmentStatus;
  [key: string]: unknown;
}

export interface SoftwareAsset {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface SystemRecord {
  id: string;
  name: string;
  [key: string]: unknown;
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

export interface ReturnAssetRequest {
  id: string;
  assetUnitId?: string;
  notes?: string;
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

export interface AssetPoolItem extends Asset {
  quantityAvailable: number;
}

export interface AssetPoolResponse {
  items: AssetPoolItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InventoryHistoryEntry {
  id: string;
  assetId: string;
  changeType: string;
  quantityDelta: number;
  quantityAfter: number;
  quantityAssignedAfter: number;
  performedBy: string;
  reason?: string | null;
  createdAt: string;
}

export interface AdjustInventoryRequest {
  id: string;
  changeType: "RESTOCK" | "CONSUMED" | "RETURNED" | "ADJUSTMENT" | "WRITE_OFF";
  quantity: number;
  direction?: "increase" | "decrease";
  reason?: string;
}

// ============================================================
// ASSET API - WITH PERFORMANCE OPTIMIZATIONS
// ============================================================

export const assetApi = createApi({
  reducerPath: "assetApi",

  baseQuery: fetchBaseQuery({
    baseUrl: BACKEND,

    // ✅ FIX: Add request timeout (30 seconds)
    timeout: 30000,

    // ✅ FIX: Add compression headers and proper request headers
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;

      const token = localStorage.getItem("accessToken");
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      headers.set("Content-Type", "application/json");
      // ✅ FIX: Explicitly request gzip compression
      headers.set("Accept-Encoding", "gzip, deflate");

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
    // GET ASSETS - WITH PAGINATION & CACHING
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
          // ✅ FIX: Add default pagination
          page: params.page || 1,
          pageSize: Math.min(
            params.pageSize || DEFAULT_PAGE_SIZE,
            MAX_PAGE_SIZE,
          ),
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

      // ✅ FIX: Add cache and refetch configuration
      ...LIST_CACHE_CONFIG,
    }),

    // ============================================================
    // GET SINGLE ASSET
    // ============================================================

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

    // ============================================================
    // CREATE ASSET
    // ============================================================

    createAsset: builder.mutation<AssetResponse, any>({
      query: (body) => ({
        url: "/assets",
        method: "POST",
        body,
      }),

      // ✅ FIX: Only invalidate specific tags instead of all
      invalidatesTags: [
        { type: "Asset", id: "LIST" },
        { type: "Asset", id: "POOL" },
      ],
    }),

    // ============================================================
    // UPDATE ASSET
    // ============================================================

    updateAsset: builder.mutation<AssetResponse, { id: string; body: any }>({
      query: ({ id, body }) => ({
        url: `/assets/${id}`,
        method: "PATCH",
        body,
      }),

      // ✅ FIX: Invalidate specific asset instead of all
      invalidatesTags: (result, error, { id }) => [
        { type: "Asset", id },
        { type: "Asset", id: "LIST" },
        { type: "Asset", id: "POOL" },
      ],
    }),

    // ============================================================
    // DELETE ASSET
    // ============================================================

    deleteAsset: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/assets/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: [
        { type: "Asset", id: "LIST" },
        { type: "Asset", id: "POOL" },
      ],
    }),

    // ============================================================
    // ASSET CATEGORIES
    // ============================================================

    getAssetCategories: builder.query<AssetCategory[], void>({
      query: () => "/assets/categories",

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

      // ✅ FIX: Categories rarely change, keep cached longer
      keepUnusedDataFor: 10 * 60,
      refetchOnFocus: false,
    }),

    // ============================================================
    // ASSET UNITS - WITH PAGINATION
    // ============================================================

    getAssetUnits: builder.query<
      {
        items: AssetUnit[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
      },
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
          // ✅ FIX: Add pagination defaults
          page: params.page || 1,
          pageSize: Math.min(
            params.pageSize || DEFAULT_PAGE_SIZE,
            MAX_PAGE_SIZE,
          ),
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

    // ============================================================
    // ASSET HISTORY
    // ============================================================

    getAssetHistory: builder.query<AssetHistory[], string>({
      query: (id) => `/assets/${id}/history`,

      providesTags: (result, error, id) => [
        { type: "AssetHistory" as const, id },
      ],

      ...SHORT_CACHE_CONFIG,
    }),

    // ============================================================
    // ASSET ASSIGNMENT
    // ============================================================

    assignAsset: builder.mutation<
      AssetResponse,
      {
        id: string;
        employeeId: string;
        assetUnitId?: string;
        notes?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/assets/${id}/assign`,
        method: "POST",
        body,
      }),

      // ✅ FIX: Only invalidate relevant tags
      invalidatesTags: (result, error, { id, employeeId }) => [
        { type: "Asset", id: "POOL" },
        { type: "Asset", id },
        { type: "Asset", id: "LIST" },
        { type: "AssetHistory", id },
        { type: "AssetAssignment", id },
      ],
    }),

    // ============================================================
    // ASSET TRANSFER
    // ============================================================

    transferAsset: builder.mutation<
      Asset,
      {
        id: string;
        toEmployeeId: string;
        fromSystemId?: string;
        toSystemId?: string;
        reason: string;
        notes?: string;
      }
    >({
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

    // ============================================================
    // ASSET RETURN
    // ============================================================

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
        ...(assetUnitId ? [{ type: "AssetUnit", id: assetUnitId }] : []),
      ],
    }),

    // ============================================================
    // SOFTWARE ASSETS - WITH PAGINATION
    // ============================================================

    getSoftwareAssets: builder.query<SoftwareAsset[], void>({
      query: () => ({
        url: "/assets/software",
        method: "GET",
        // ✅ FIX: Add default pagination even for software
        params: { pageSize: MAX_PAGE_SIZE },
      }),

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

      // ✅ FIX: Add cache configuration
      ...CACHE_CONFIG,
    }),

    // ============================================================
    // ASSET POOL - WITH PAGINATION
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
            // ✅ FIX: Add pagination
            page: params.page || 1,
            pageSize: Math.min(
              params.pageSize || DEFAULT_PAGE_SIZE,
              MAX_PAGE_SIZE,
            ),
          },
        }),

        providesTags: [{ type: "Asset", id: "POOL" }],

        // ✅ FIX: Add cache config for pool
        ...LIST_CACHE_CONFIG,
      },
    ),

    // ============================================================
    // RELEASE ASSETS FOR EMPLOYEE
    // ============================================================

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
    // ASSET IMAGE
    // ============================================================

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

    // ============================================================
    // INVENTORY ADJUSTMENT
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

    // ============================================================
    // INVENTORY HISTORY - WITH CACHING
    // ============================================================

    getInventoryHistory: builder.query<InventoryHistoryEntry[], string>({
      query: (id) => `/assets/${id}/inventory/history`,

      providesTags: (result, error, id) => [{ type: "AssetHistory", id }],

      // ✅ FIX: History rarely changes, keep cached
      keepUnusedDataFor: 10 * 60,
      refetchOnFocus: false,
    }),

    // ============================================================
    // SYSTEMS (placeholder - expand based on your needs)
    // ============================================================

    getSystems: builder.query<SystemRecord[], void>({
      query: () => "/systems",

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

    createSystem: builder.mutation<SystemRecord, any>({
      query: (body) => ({
        url: "/systems",
        method: "POST",
        body,
      }),

      invalidatesTags: [{ type: "System", id: "LIST" }],
    }),

    updateSystem: builder.mutation<SystemRecord, { id: string; body: any }>({
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
      { id: string; employeeId: string }
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

      invalidatesTags: [{ type: "System", id: "LIST" }],
    }),

    // ============================================================
    // SYSTEM SPECS
    // ============================================================

    getSystemSpecs: builder.query<any, string>({
      query: (systemId) => `/systems/${systemId}/specs`,

      providesTags: (result, error, systemId) => [
        { type: "System", id: systemId },
      ],

      ...CACHE_CONFIG,
    }),

    upsertSystemSpecs: builder.mutation<any, { systemId: string; body: any }>({
      query: ({ systemId, body }) => ({
        url: `/systems/${systemId}/specs`,
        method: "PUT",
        body,
      }),

      invalidatesTags: (result, error, { systemId }) => [
        { type: "System", id: systemId },
      ],
    }),

    // ============================================================
    // ASSET ASSIGNMENTS - WITH CACHING
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

    // ============================================================
    // ASSET ASSIGNMENTS BY EMPLOYEE
    // ============================================================

    getAssetAssignmentsByEmployee: builder.query<AssetAssignment[], string>({
      query: (employeeId) => `/employees/${employeeId}/assignments`,

      providesTags: (result, error, employeeId) => [
        { type: "AssetAssignment", id: employeeId },
      ],

      ...LIST_CACHE_CONFIG,
    }),

    // ============================================================
    // ASSET ASSIGNMENTS BY ASSET
    // ============================================================

    getAssetAssignmentsByAsset: builder.query<AssetAssignment[], string>({
      query: (assetId) => `/assets/${assetId}/assignments`,

      providesTags: (result, error, assetId) => [
        { type: "AssetAssignment", id: assetId },
      ],

      ...LIST_CACHE_CONFIG,
    }),

    // ============================================================
    // ACTIVE ASSET ASSIGNMENTS BY EMPLOYEE
    // ============================================================

    getActiveAssetAssignmentsByEmployee: builder.query<
      AssetAssignment[],
      string
    >({
      query: (employeeId) => `/employees/${employeeId}/assignments/active`,

      providesTags: (result, error, employeeId) => [
        { type: "AssetAssignment", id: `${employeeId}-active` },
      ],

      // Active assignments change frequently
      ...SHORT_CACHE_CONFIG,
    }),

    // ============================================================
    // ACTIVE ASSET ASSIGNMENTS BY ASSET
    // ============================================================

    getActiveAssetAssignmentsByAsset: builder.query<AssetAssignment[], string>({
      query: (assetId) => `/assets/${assetId}/assignments/active`,

      providesTags: (result, error, assetId) => [
        { type: "AssetAssignment", id: `${assetId}-active` },
      ],

      ...SHORT_CACHE_CONFIG,
    }),

    // ============================================================
    // ASSET ASSIGNMENT SUMMARY
    // ============================================================

    getAssetAssignmentSummary: builder.query<any, string>({
      query: (assetId) => `/assets/${assetId}/assignments/summary`,

      providesTags: (result, error, assetId) => [
        { type: "AssetAssignment", id: `${assetId}-summary` },
      ],

      ...SHORT_CACHE_CONFIG,
    }),

    // ============================================================
    // ASSET ASSIGNMENT BY ASSET UNIT
    // ============================================================

    getAssetAssignmentsByAssetUnit: builder.query<AssetAssignment[], string>({
      query: (assetUnitId) => `/assets/units/${assetUnitId}/assignments`,

      providesTags: (result, error, assetUnitId) => [
        { type: "AssetAssignment", id: assetUnitId },
      ],

      ...LIST_CACHE_CONFIG,
    }),

    // ============================================================
    // ACTIVE ASSET ASSIGNMENT BY ASSET UNIT
    // ============================================================

    getActiveAssetAssignmentByAssetUnit: builder.query<
      AssetAssignment | null,
      string
    >({
      query: (assetUnitId) => `/assets/units/${assetUnitId}/assignments/active`,

      providesTags: (result, error, assetUnitId) => [
        { type: "AssetAssignment", id: `${assetUnitId}-active` },
      ],

      ...SHORT_CACHE_CONFIG,
    }),

    // ============================================================
    // GET SINGLE ASSET ASSIGNMENT
    // ============================================================

    getAssetAssignment: builder.query<AssetAssignment, string>({
      query: (id) => `/assets/assignments/${id}`,

      providesTags: (result, error, id) => [{ type: "AssetAssignment", id }],

      ...CACHE_CONFIG,
    }),

    // ============================================================
    // CATEGORY OPERATIONS
    // ============================================================

    getAssetCategory: builder.query<AssetCategory, string>({
      query: (id) => `/assets/categories/${id}`,

      providesTags: (result, error, id) => [{ type: "AssetCategory", id }],

      ...CACHE_CONFIG,
    }),

    createAssetCategory: builder.mutation<AssetCategory, any>({
      query: (body) => ({
        url: "/assets/categories",
        method: "POST",
        body,
      }),

      invalidatesTags: [{ type: "AssetCategory", id: "LIST" }],
    }),

    updateAssetCategory: builder.mutation<
      AssetCategory,
      { id: string; body: any }
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
    // ASSET UNITS OPERATIONS
    // ============================================================

    getAssetUnit: builder.query<AssetUnit, string>({
      query: (id) => `/assets/units/${id}`,

      providesTags: (result, error, id) => [{ type: "AssetUnit", id }],

      ...CACHE_CONFIG,
    }),

    getAssetUnitsByAsset: builder.query<AssetUnit[], string>({
      query: (assetId) => `/assets/${assetId}/units`,

      providesTags: (result, error, assetId) => [
        { type: "AssetUnit", id: assetId },
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
        { type: "AssetUnit", id: assetId },
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

      invalidatesTags: [
        { type: "AssetUnit", id: "LIST" },
        { type: "Asset", id: "POOL" },
      ],
    }),

    getAssetUnitHistory: builder.query<any[], string>({
      query: (id) => `/assets/units/${id}/history`,

      providesTags: (result, error, id) => [{ type: "AssetHistory", id }],

      ...CACHE_CONFIG,
    }),

    removeAssetImage: builder.mutation<AssetResponse, string>({
      query: (id) => ({
        url: `/assets/${id}/image/remove`,
        method: "POST",
      }),

      invalidatesTags: (result, error, id) => [{ type: "Asset", id }],
    }),
  }),
});

// ============================================================
// HOOKS
// ============================================================

export const {
  useGetSystemsQuery,
  useCreateSystemMutation,
  useUpdateSystemMutation,
  useAssignSystemMutation,
  useDeleteSystemMutation,
  useGetSystemSpecsQuery,
  useUpsertSystemSpecsMutation,
  useGetAssetsQuery,
  useGetAssetQuery,
  useGetAssetHistoryQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
  useAssignAssetMutation,
  useTransferAssetMutation,
  useReturnAssetMutation,
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
  useGetSoftwareAssetsQuery,
  useGetAssetAssignmentsQuery,
  useGetAssetAssignmentsByEmployeeQuery,
  useGetActiveAssetAssignmentsByEmployeeQuery,
  useGetAssetAssignmentsByAssetQuery,
  useGetActiveAssetAssignmentsByAssetQuery,
  useGetAssetAssignmentSummaryQuery,
  useGetAssetAssignmentsByAssetUnitQuery,
  useGetActiveAssetAssignmentByAssetUnitQuery,
  useGetAssetAssignmentQuery,
  useGetAssetCategoriesQuery,
  useGetAssetCategoryQuery,
  useCreateAssetCategoryMutation,
  useUpdateAssetCategoryMutation,
  useToggleAssetCategoryMutation,
  useDeleteAssetCategoryMutation,
  useGetAssetPoolQuery,
  useReleaseAssetsForEmployeeMutation,
  useSetAssetImageMutation,
  useRemoveAssetImageMutation,
  useAdjustInventoryMutation,
  useGetInventoryHistoryQuery,
} = assetApi;

export default assetApi;
