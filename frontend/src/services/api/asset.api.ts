import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";
import { BACKEND } from "../../lib/api";

// ============================================================
// ENUMS
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
// ORGANISATION
// ============================================================

export interface AssetOrganisation {
  id: string;
  name?: string;
  [key: string]: unknown;
}

// ============================================================
// EMPLOYEE
// ============================================================

export interface AssetEmployee {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  employeeId?: string;
  email?: string;
  [key: string]: unknown;
}

// ============================================================
// LOCATION
// ============================================================

export interface AssetLocation {
  id: string;
  name?: string;
  [key: string]: unknown;
}

// ============================================================
// VENDOR
// ============================================================

export interface AssetVendor {
  id: string;
  name: string;
  [key: string]: unknown;
}

// ============================================================
// ASSET CATEGORY
// ============================================================

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

// ============================================================
// ASSET UNIT
// ============================================================

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

// ============================================================
// ASSET UNIT QUERY PARAMS
// ============================================================

export interface GetAssetUnitsParams {
  assetId?: string;
  search?: string;
  status?: AssetUnitStatus;
  condition?: AssetUnitCondition;
  locationId?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================
// ASSET UNIT REQUESTS
// ============================================================

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

export interface UpdateAssetUnitStatusRequest {
  id: string;

  status: AssetUnitStatus;

  notes?: string | null;
}

export interface UpdateAssetUnitConditionRequest {
  id: string;

  condition: AssetUnitCondition;

  notes?: string | null;
}

export interface UpdateAssetUnitLocationRequest {
  id: string;

  locationId?: string | null;

  notes?: string | null;
}

// ============================================================
// ASSET UNIT RESPONSE TYPES
// ============================================================

export interface AssetUnitsResponse {
  items: AssetUnit[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;

  [key: string]: unknown;
}

export interface AssetUnitResponse {
  data: AssetUnit;

  message?: string;

  [key: string]: unknown;
}

export interface AssetUnitHistoryEntry {
  id: string;

  assetId: string;

  assetUnitId?: string | null;

  action: string;

  performedBy: string;

  fromValue?: string | null;

  toValue?: string | null;

  notes?: string | null;

  createdAt: string;

  asset?: Asset;

  assetUnit?: AssetUnit;

  [key: string]: unknown;
}

export interface AssetUnitHistoryResponse {
  data: AssetUnitHistoryEntry[];

  message?: string;

  [key: string]: unknown;
}

// ============================================================
// ASSET POOL
// ============================================================

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

// ============================================================
// INVENTORY
// ============================================================

export interface AdjustInventoryRequest {
  id: string;

  changeType: "RESTOCK" | "CONSUMED" | "RETURNED" | "ADJUSTMENT" | "WRITE_OFF";

  quantity: number;

  direction?: "increase" | "decrease";

  reason?: string;
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

// ============================================================
// SOFTWARE LICENSE
// ============================================================

export interface AssetLicense {
  id: string;

  assetId: string;

  vendor: string;

  licenseType: string;

  licenseReference: string;

  totalSeats: number;

  assignedSeats: number;

  purchaseDate?: string | null;

  expiryDate?: string | null;

  renewalDate?: string | null;

  cost?: number | null;

  [key: string]: unknown;
}

// ============================================================
// SYSTEM
// ============================================================

export interface SystemRecord {
  id: string;

  systemTag: string;

  name: string;

  notes?: string | null;

  employeeId: string | null;

  employee?: AssetEmployee;

  assignments?: AssetAssignment[];
}

// ============================================================
// ASSET ASSIGNMENT
// ============================================================

export interface AssetAssignment {
  id: string;

  assetId: string;

  assetUnitId?: string | null;

  employeeId: string | null;

  systemId?: string | null;

  system?: SystemRecord;

  assignedAt: string;

  returnedAt?: string | null;

  assignedBy: string;

  status: AssignmentStatus;

  notes?: string | null;

  employee?: AssetEmployee;

  asset?: Asset;

  assetUnit?: AssetUnit;

  [key: string]: unknown;
}

// ============================================================
// ASSET TRANSFER
// ============================================================

export interface AssetTransfer {
  id: string;

  assetId: string;

  fromEmployeeId?: string | null;

  toEmployeeId: string;

  requestedById: string;

  approvedById?: string | null;

  status: TransferStatus;

  reason?: string | null;

  notes?: string | null;

  approvedAt?: string | null;

  createdAt?: string;

  updatedAt?: string;

  asset?: Asset;

  fromEmployee?: AssetEmployee;

  toEmployee?: AssetEmployee;

  requestedBy?: AssetUser;

  approvedBy?: AssetUser;

  [key: string]: unknown;
}

// ============================================================
// USER
// ============================================================

export interface AssetUser {
  id: string;

  name?: string;

  firstName?: string;

  lastName?: string;

  email?: string;

  [key: string]: unknown;
}

// ============================================================
// ASSET HISTORY
// ============================================================

export interface AssetHistory {
  id: string;

  assetId: string;

  assetUnitId?: string | null;

  action: string;

  performedBy: string;

  fromValue?: string | null;

  toValue?: string | null;

  notes?: string | null;

  createdAt: string;

  asset?: Asset;

  assetUnit?: AssetUnit;

  [key: string]: unknown;
}

// ============================================================
// ASSET
// ============================================================

export interface Asset {
  id: string;

  // Basic
  name: string;

  assetTag?: string | null;

  serialNumber?: string | null;

  kind: AssetKind;

  trackingMode: AssetTrackingMode;

  // Organisation
  organisationId?: string | null;

  organisation?: AssetOrganisation;

  // Category
  categoryId: string;

  category?: AssetCategory;

  // Manufacturer
  manufacturer?: string | null;

  model?: string | null;

  // Vendor
  vendorId?: string | null;

  vendor?: AssetVendor;

  // Invoice
  invoiceNumber?: string | null;

  // Purchase
  purchaseDate?: string | null;

  purchasePrice?: number | null;

  // Warranty
  warrantyStart?: string | null;

  warrantyExpiry?: string | null;

  // Legacy aggregate status
  status: AssetStatus;

  // Legacy aggregate condition
  condition: AssetCondition;

  // Legacy aggregate location
  locationId?: string | null;

  location?: AssetLocation;

  // Notes
  notes?: string | null;

  // Software
  license?: AssetLicense | null;

  // Asset units
  units?: AssetUnit[];

  // Assignment history
  assignments?: AssetAssignment[];

  // Transfer history
  transfers?: AssetTransfer[];

  // Audit history
  history?: AssetHistory[];

  // Inventory
  quantity?: number;

  quantityAssigned?: number;

  reorderLevel?: number | null;

  // Image
  imageKey?: string | null;

  imageUrl?: string | null;

  // Timestamps
  createdAt?: string;

  updatedAt?: string;

  [key: string]: unknown;
}

// ============================================================
// SOFTWARE ASSET
// ============================================================

export interface SoftwareAsset extends Asset {
  kind: "SOFTWARE";

  license?: AssetLicense | null;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface AssetsResponse {
  items: Asset[];

  total: number;

  page: number;

  pageSize: number;

  totalPages: number;

  [key: string]: unknown;
}

export interface AssetResponse {
  data: Asset;

  message?: string;

  [key: string]: unknown;
}

export interface AssetHistoryResponse {
  data: AssetHistory[];

  message?: string;

  [key: string]: unknown;
}

export interface AssetTransfersResponse {
  data: AssetTransfer[];

  message?: string;

  [key: string]: unknown;
}

export interface AssetAssignmentsResponse {
  data: AssetAssignment[];

  message?: string;

  [key: string]: unknown;
}

export interface SoftwareAssetsResponse {
  data: SoftwareAsset[];

  message?: string;

  [key: string]: unknown;
}

// ============================================================
// CATEGORY RESPONSE TYPES
// ============================================================

export type AssetCategoriesResponse = AssetCategory[];

export interface AssetCategoryResponse {
  data: AssetCategory;

  message?: string;

  [key: string]: unknown;
}

// ============================================================
// VENDOR RESPONSE TYPES
// ============================================================

export interface VendorsResponse {
  data: AssetVendor[];

  message?: string;

  [key: string]: unknown;
}

export interface VendorResponse {
  data: AssetVendor;

  message?: string;

  [key: string]: unknown;
}

// ============================================================
// CATEGORY REQUEST TYPES
// ============================================================

export interface CreateAssetCategoryRequest {
  name: string;

  description?: string | null;

  type: AssetKind;

  organisationId?: string | null;

  isActive?: boolean;
}

export interface UpdateAssetCategoryRequest {
  id: string;

  name?: string;

  description?: string | null;

  type?: AssetKind;

  organisationId?: string | null;

  isActive?: boolean;
}

export interface GetAssetCategoriesParams {
  organisationId?: string;

  type?: AssetKind;

  isActive?: boolean;
}

// ============================================================
// ASSET QUERY PARAMS
// ============================================================

export interface GetAssetsParams {
  search?: string;

  organisationId?: string;

  kind?: AssetKind;

  trackingMode?: AssetTrackingMode;

  status?: AssetStatus;

  condition?: AssetCondition;

  categoryId?: string;

  locationId?: string;

  vendorId?: string;

  assigned?: boolean;

  sortBy?: string;

  sortDir?: "ASC" | "DESC";

  page?: number;

  pageSize?: number;
}

// ============================================================
// CREATE ASSET
// ============================================================

export interface CreateAssetRequest {
  name: string;
  assetTag?: string | null;
  serialNumber?: string | null;
  kind: AssetKind;
  trackingMode?: AssetTrackingMode;
  organisationId?: string | null;
  categoryId: string;
  manufacturer?: string | null;
  model?: string | null;
  vendorId?: string | null;
  invoiceNumber?: string | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  warrantyStart?: string | null;
  warrantyExpiry?: string | null;
  status?: AssetStatus;
  condition?: AssetCondition;
  locationId?: string | null;
  notes?: string | null;
  quantity?: number;
  quantityAssigned?: number;
  reorderLevel?: number | null;

  // renamed from `units` to match CreateAssetDto
  initialUnits?: {
    unitCode?: string;
    serialNumber?: string;
    status?: AssetStatus;
    condition?: AssetCondition;
    locationId?: string;
    notes?: string;
  }[];
}

// ============================================================
// UPDATE ASSET
// ============================================================

export interface UpdateAssetRequest {
  id: string;

  name?: string;

  assetTag?: string | null;

  serialNumber?: string | null;

  kind?: AssetKind;

  trackingMode?: AssetTrackingMode;

  organisationId?: string | null;

  categoryId?: string;

  manufacturer?: string | null;

  model?: string | null;

  vendorId?: string | null;

  invoiceNumber?: string | null;

  purchaseDate?: string | null;

  purchasePrice?: number | null;

  warrantyStart?: string | null;

  warrantyExpiry?: string | null;

  status?: AssetStatus;

  condition?: AssetCondition;

  locationId?: string | null;

  notes?: string | null;

  quantity?: number;

  reorderLevel?: number | null;
}

// ============================================================
// ASSIGN ASSET
// ============================================================

export interface AssignAssetRequest {
  id: string;

  employeeId?: string;

  systemId?: string;

  assetUnitId?: string;

  notes?: string | null;
}

// ============================================================
// TRANSFER ASSET
// ============================================================

export interface TransferAssetRequest {
  id: string;

  employeeId: string;

  reason?: string | null;

  notes?: string | null;
}

// ============================================================
// RETURN ASSET
// ============================================================

export interface ReturnAssetRequest {
  id: string;

  assetUnitId?: string;

  notes?: string | null;
}

// ============================================================
// CREATE SOFTWARE LICENSE
// ============================================================

export interface CreateSoftwareLicenseRequest {
  assetId: string;

  vendor: string;

  licenseType: string;

  licenseReference: string;

  totalSeats?: number;

  assignedSeats?: number;

  purchaseDate?: string | null;

  expiryDate?: string | null;

  renewalDate?: string | null;

  cost?: number | null;
}

// ============================================================
// API
// ============================================================

export const assetApi = createApi({
  reducerPath: "assetApi",

  baseQuery: fetchBaseQuery({
    baseUrl: BACKEND,

    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;

      void state;

      const token = localStorage.getItem("accessToken");

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      headers.set("Content-Type", "application/json");

      return headers;
    },
  }),

  tagTypes: [
    "System",
    "Asset",
    "AssetUnit",
    "AssetHistory",
    "AssetAssignment",
    "AssetTransfer",
    "SoftwareAsset",
    "AssetCategory",
    "Vendor",
  ],

  endpoints: (builder) => ({
    // ============================================================
    // SYSTEMS
    // ============================================================

    getSystems: builder.query<
      SystemRecord[],
      { search?: string; employeeId?: string } | void
    >({
      query: (params) => ({
        url: "/systems",
        params: params || undefined,
      }),

      providesTags: ["System"],
    }),

    createSystem: builder.mutation<
      SystemRecord,
      {
        name: string;
        systemTag: string;
        notes?: string;
      }
    >({
      query: (body) => ({
        url: "/systems",
        method: "POST",
        body,
      }),

      invalidatesTags: ["System"],
    }),

    updateSystem: builder.mutation<
      SystemRecord,
      {
        id: string;
        name: string;
        systemTag: string;
        notes?: string;
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/systems/${id}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: ["System", "Asset"],
    }),

    assignSystem: builder.mutation<
      SystemRecord,
      {
        id: string;
        employeeId: string | null;
      }
    >({
      query: ({ id, employeeId }) => ({
        url: `/systems/${id}/${employeeId ? "assign" : "return"}`,
        method: "POST",
        body: employeeId ? { employeeId } : {},
      }),

      invalidatesTags: ["System", "Asset", "AssetHistory", "AssetAssignment"],
    }),

    // ============================================================
    // ASSET CATEGORIES
    // ============================================================

    getAssetCategories: builder.query<
      AssetCategoriesResponse,
      GetAssetCategoriesParams | undefined
    >({
      query: (params = {}) => ({
        url: "/asset-categories",
        method: "GET",

        params: {
          organisationId: params.organisationId || undefined,
          type: params.type || undefined,
          isActive: params.isActive !== undefined ? params.isActive : undefined,
        },
      }),

      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "AssetCategory" as const,
                id,
              })),
              {
                type: "AssetCategory" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "AssetCategory" as const,
                id: "LIST",
              },
            ],
    }),

    getAssetCategory: builder.query<AssetCategoryResponse, string>({
      query: (id) => `/asset-categories/${id}`,

      providesTags: (result, error, id) => [
        {
          type: "AssetCategory" as const,
          id,
        },
      ],
    }),

    createAssetCategory: builder.mutation<
      AssetCategoryResponse,
      CreateAssetCategoryRequest
    >({
      query: (body) => ({
        url: "/asset-categories",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        {
          type: "AssetCategory",
          id: "LIST",
        },
        {
          type: "Asset",
          id: "LIST",
        },
      ],
    }),

    updateAssetCategory: builder.mutation<
      AssetCategoryResponse,
      UpdateAssetCategoryRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/asset-categories/${id}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        "System",
        {
          type: "Asset",
          id: "POOL",
        },
        {
          type: "AssetCategory",
          id,
        },
        {
          type: "AssetCategory",
          id: "LIST",
        },
        {
          type: "Asset",
          id: "LIST",
        },
      ],
    }),

    toggleAssetCategory: builder.mutation<AssetCategoryResponse, string>({
      query: (id) => ({
        url: `/asset-categories/${id}/toggle-active`,
        method: "PATCH",
      }),

      invalidatesTags: (result, error, id) => [
        {
          type: "AssetCategory",
          id,
        },
        {
          type: "AssetCategory",
          id: "LIST",
        },
      ],
    }),

    deleteAssetCategory: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/asset-categories/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: [
        {
          type: "AssetCategory",
          id: "LIST",
        },
        {
          type: "Asset",
          id: "LIST",
        },
      ],
    }),

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
          trackingMode: params.trackingMode || undefined,
          status: params.status || undefined,
          condition: params.condition || undefined,
          categoryId: params.categoryId || undefined,
          locationId: params.locationId || undefined,
          vendorId: params.vendorId || undefined,
          assigned: params.assigned !== undefined ? params.assigned : undefined,
          sortBy: params.sortBy || undefined,
          sortDir: params.sortDir || undefined,
          page: params.page || undefined,
          pageSize: params.pageSize || undefined,
        },
      }),

      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map(({ id }) => ({
                type: "Asset" as const,
                id,
              })),
              {
                type: "Asset" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "Asset" as const,
                id: "LIST",
              },
            ],
    }),

    getAsset: builder.query<AssetResponse, string>({
      query: (id) => `/assets/${id}`,

      providesTags: (result, error, id) => [
        {
          type: "Asset" as const,
          id,
        },
      ],
    }),

    getAssetHistory: builder.query<AssetHistoryResponse, string>({
      query: (id) => `/assets/${id}/history`,

      providesTags: (result, error, id) => [
        {
          type: "AssetHistory" as const,
          id,
        },
      ],
    }),

    createAsset: builder.mutation<AssetResponse, CreateAssetRequest>({
      query: (body) => ({
        url: "/assets",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        {
          type: "Asset",
          id: "LIST",
        },
        "SoftwareAsset",
        {
          type: "AssetCategory",
          id: "LIST",
        },
        "Vendor",
      ],
    }),

    updateAsset: builder.mutation<AssetResponse, UpdateAssetRequest>({
      query: ({ id, ...body }) => ({
        url: `/assets/${id}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        "System",
        {
          type: "Asset",
          id: "POOL",
        },
        {
          type: "Asset",
          id,
        },
        {
          type: "Asset",
          id: "LIST",
        },
        "SoftwareAsset",
        {
          type: "AssetCategory",
          id: "LIST",
        },
        "Vendor",
      ],
    }),

    deleteAsset: builder.mutation<{ message?: string; id?: string }, string>({
      query: (id) => ({
        url: `/assets/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: (result, error, id) => [
        {
          type: "Asset",
          id,
        },
        {
          type: "Asset",
          id: "LIST",
        },
        {
          type: "Asset",
          id: "POOL",
        },
        "SoftwareAsset",
        {
          type: "AssetHistory",
          id,
        },
        {
          type: "AssetUnit",
          id: "LIST",
        },
      ],
    }),

    // ============================================================
    // ASSET UNITS
    // ============================================================

    getAssetUnits: builder.query<
      AssetUnitsResponse,
      GetAssetUnitsParams | undefined
    >({
      query: (params = {}) => ({
        url: "/asset-units",
        method: "GET",

        params: {
          assetId: params.assetId || undefined,
          search: params.search || undefined,
          status: params.status || undefined,
          condition: params.condition || undefined,
          locationId: params.locationId || undefined,
          page: params.page || undefined,
          pageSize: params.pageSize || undefined,
        },
      }),

      providesTags: (result) =>
        result?.items
          ? [
              ...result.items.map(({ id }) => ({
                type: "AssetUnit" as const,
                id,
              })),
              {
                type: "AssetUnit" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "AssetUnit" as const,
                id: "LIST",
              },
            ],
    }),

    getAssetUnit: builder.query<AssetUnitResponse, string>({
      query: (id) => `/asset-units/${id}`,

      providesTags: (result, error, id) => [
        {
          type: "AssetUnit" as const,
          id,
        },
      ],
    }),

    getAssetUnitsByAsset: builder.query<AssetUnitsResponse, string>({
      query: (assetId) => ({
        url: "/asset-units",
        method: "GET",

        params: {
          assetId,
        },
      }),

      providesTags: (result, error, assetId) => [
        {
          type: "AssetUnit" as const,
          id: `ASSET-${assetId}`,
        },
        {
          type: "AssetUnit" as const,
          id: "LIST",
        },
        ...(result?.items || []).map(({ id }) => ({
          type: "AssetUnit" as const,
          id,
        })),
      ],
    }),

    createAssetUnit: builder.mutation<
      AssetUnitResponse,
      CreateAssetUnitRequest
    >({
      query: (body) => ({
        url: "/asset-units",
        method: "POST",
        body,
      }),

      invalidatesTags: (result, error, body) => [
        {
          type: "AssetUnit",
          id: "LIST",
        },
        {
          type: "AssetUnit",
          id: `ASSET-${body.assetId}`,
        },
        {
          type: "Asset",
          id: body.assetId,
        },
        {
          type: "Asset",
          id: "LIST",
        },
      ],
    }),

    updateAssetUnit: builder.mutation<
      AssetUnitResponse,
      UpdateAssetUnitRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/asset-units/${id}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => {
        const assetId = result?.data?.assetId;

        return [
          {
            type: "AssetUnit",
            id,
          },
          {
            type: "AssetUnit",
            id: "LIST",
          },
          ...(assetId
            ? [
                {
                  type: "AssetUnit" as const,
                  id: `ASSET-${assetId}`,
                },
                {
                  type: "Asset" as const,
                  id: assetId,
                },
              ]
            : []),
        ];
      },
    }),

    updateAssetUnitStatus: builder.mutation<
      AssetUnitResponse,
      UpdateAssetUnitStatusRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/asset-units/${id}/status`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        {
          type: "AssetUnit",
          id,
        },
        {
          type: "AssetUnit",
          id: "LIST",
        },
        {
          type: "Asset",
          id: "LIST",
        },
      ],
    }),

    updateAssetUnitCondition: builder.mutation<
      AssetUnitResponse,
      UpdateAssetUnitConditionRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/asset-units/${id}/condition`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        {
          type: "AssetUnit",
          id,
        },
        {
          type: "AssetUnit",
          id: "LIST",
        },
        {
          type: "Asset",
          id: "LIST",
        },
      ],
    }),

    updateAssetUnitLocation: builder.mutation<
      AssetUnitResponse,
      UpdateAssetUnitLocationRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/asset-units/${id}/location`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        {
          type: "AssetUnit",
          id,
        },
        {
          type: "AssetUnit",
          id: "LIST",
        },
        {
          type: "Asset",
          id: "LIST",
        },
      ],
    }),

    deleteAssetUnit: builder.mutation<
      { message?: string; id?: string },
      string
    >({
      query: (id) => ({
        url: `/asset-units/${id}`,
        method: "DELETE",
      }),

      invalidatesTags: (result, error, id) => [
        {
          type: "AssetUnit",
          id,
        },
        {
          type: "AssetUnit",
          id: "LIST",
        },
        {
          type: "Asset",
          id: "LIST",
        },
        {
          type: "AssetHistory",
          id,
        },
      ],
    }),

    getAssetUnitHistory: builder.query<AssetUnitHistoryResponse, string>({
      query: (id) => `/asset-units/${id}/history`,

      providesTags: (result, error, id) => [
        {
          type: "AssetHistory",
          id: `UNIT-${id}`,
        },
        {
          type: "AssetUnit",
          id,
        },
      ],
    }),

    // ============================================================
    // ASSIGN
    // ============================================================

    assignAsset: builder.mutation<AssetResponse, AssignAssetRequest>({
      query: ({ id, ...body }) => ({
        url: `/assets/${id}/assign`,
        method: "POST",
        body,
      }),

      invalidatesTags: (result, error, { id, assetUnitId }) => [
        "System",
        {
          type: "Asset",
          id: "POOL",
        },
        {
          type: "Asset",
          id,
        },
        {
          type: "Asset",
          id: "LIST",
        },
        {
          type: "AssetHistory",
          id,
        },
        {
          type: "AssetAssignment",
          id,
        },
        ...(assetUnitId
          ? [
              {
                type: "AssetUnit" as const,
                id: assetUnitId,
              },
            ]
          : []),
        "SoftwareAsset",
      ],
    }),

    // ============================================================
    // TRANSFER
    // ============================================================

    transferAsset: builder.mutation<
      Asset,
      {
        id: string;
        toEmployeeId: string;
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
        "System",
        {
          type: "Asset",
          id: "POOL",
        },
        {
          type: "Asset",
          id,
        },
        {
          type: "Asset",
          id: "LIST",
        },
        {
          type: "AssetHistory",
          id,
        },
        {
          type: "AssetTransfer",
          id,
        },
        "AssetUnit",
      ],
    }),

    // ============================================================
    // RETURN
    // ============================================================

    returnAsset: builder.mutation<AssetResponse, ReturnAssetRequest>({
      query: ({ id, assetUnitId, notes }) => ({
        url: `/assets/${id}/return`,
        method: "POST",

        body: {
          assetUnitId,
          notes,
        },
      }),

      invalidatesTags: (result, error, { id, assetUnitId }) => [
        "System",
        {
          type: "Asset",
          id: "POOL",
        },
        {
          type: "Asset",
          id,
        },
        {
          type: "Asset",
          id: "LIST",
        },
        {
          type: "AssetHistory",
          id,
        },
        {
          type: "AssetAssignment",
          id,
        },
        ...(assetUnitId
          ? [
              {
                type: "AssetUnit" as const,
                id: assetUnitId,
              },
            ]
          : []),
        "SoftwareAsset",
      ],
    }),

    // ============================================================
    // SOFTWARE ASSETS
    // ============================================================

    getSoftwareAssets: builder.query<SoftwareAsset[], void>({
      query: () => ({
        url: "/assets/software",
        method: "GET",
      }),

      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "SoftwareAsset" as const,
                id,
              })),
              {
                type: "SoftwareAsset" as const,
                id: "LIST",
              },
            ]
          : [
              {
                type: "SoftwareAsset" as const,
                id: "LIST",
              },
            ],
    }),

    // ============================================================
    // ASSET POOL
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
            page: params.page || undefined,
            pageSize: params.pageSize || undefined,
          },
        }),

        providesTags: [
          {
            type: "Asset",
            id: "POOL",
          },
        ],
      },
    ),

    // ============================================================
    // RELEASE ASSETS FOR EMPLOYEE
    // ============================================================

    releaseAssetsForEmployee: builder.mutation<
      {
        employeeId: string;
        releasedCount: number;
      },
      string
    >({
      query: (employeeId) => ({
        url: `/assets/release-for-employee/${employeeId}`,
        method: "POST",
      }),

      invalidatesTags: [
        {
          type: "Asset",
          id: "LIST",
        },
        {
          type: "Asset",
          id: "POOL",
        },
        "AssetUnit",
        "AssetAssignment",
      ],
    }),

    // ============================================================
    // ASSET IMAGE
    // ============================================================

    setAssetImage: builder.mutation<
      AssetResponse,
      {
        id: string;
        file: File;
      }
    >({
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
        "System",
        {
          type: "Asset",
          id: "POOL",
        },
        {
          type: "Asset",
          id,
        },
      ],
    }),

    removeAssetImage: builder.mutation<AssetResponse, string>({
      query: (id) => ({
        url: `/assets/${id}/image/remove`,
        method: "POST",
      }),

      invalidatesTags: (result, error, id) => [
        {
          type: "Asset",
          id,
        },
      ],
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
        "System",
        {
          type: "Asset",
          id: "POOL",
        },
        {
          type: "Asset",
          id,
        },
        {
          type: "Asset",
          id: "LIST",
        },
        {
          type: "AssetHistory",
          id,
        },
        "AssetUnit",
      ],
    }),

    getInventoryHistory: builder.query<InventoryHistoryEntry[], string>({
      query: (id) => `/assets/${id}/inventory/history`,

      providesTags: (result, error, id) => [
        {
          type: "AssetHistory" as const,
          id,
        },
      ],
    }),
  }),
});

// ============================================================
// HOOKS
// ============================================================

export const {
  // Systems
  useGetSystemsQuery,
  useCreateSystemMutation,
  useUpdateSystemMutation,
  useAssignSystemMutation,

  // Assets
  useGetAssetsQuery,
  useGetAssetQuery,
  useGetAssetHistoryQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,

  // Asset assignment
  useAssignAssetMutation,
  useTransferAssetMutation,
  useReturnAssetMutation,

  // Asset Units
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

  // Software
  useGetSoftwareAssetsQuery,

  // Categories
  useGetAssetCategoriesQuery,
  useGetAssetCategoryQuery,
  useCreateAssetCategoryMutation,
  useUpdateAssetCategoryMutation,
  useToggleAssetCategoryMutation,
  useDeleteAssetCategoryMutation,

  // Pool
  useGetAssetPoolQuery,
  useReleaseAssetsForEmployeeMutation,

  // Image
  useSetAssetImageMutation,
  useRemoveAssetImageMutation,

  // Inventory
  useAdjustInventoryMutation,
  useGetInventoryHistoryQuery,
} = assetApi;

export default assetApi;
