import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";

// ============================================================
// ENUMS
// ============================================================

export type AssetKind = "HARDWARE" | "SOFTWARE";

export type AssetStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "REPAIR"
  | "LOST"
  | "DAMAGED"
  | "RETIRED"
  | "DISPOSED";

export type AssetCondition = "NEW" | "GOOD" | "FAIR" | "POOR";

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
// ASSET ASSIGNMENT
// ============================================================

export interface AssetAssignment {
  id: string;

  assetId: string;

  employeeId: string;

  assignedAt: string;

  returnedAt?: string | null;

  assignedBy: string;

  status: AssignmentStatus;

  notes?: string | null;

  employee?: AssetEmployee;

  asset?: Asset;

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

  action: string;

  performedBy: string;

  fromValue?: string | null;

  toValue?: string | null;

  notes?: string | null;

  createdAt: string;

  asset?: Asset;

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

  // Status
  status: AssetStatus;

  // Condition
  condition: AssetCondition;

  // Location
  locationId?: string | null;

  location?: AssetLocation;

  // Notes
  notes?: string | null;

  // Software
  license?: AssetLicense | null;

  // Assignment history
  assignments?: AssetAssignment[];

  // Transfer history
  transfers?: AssetTransfer[];

  // Audit history
  history?: AssetHistory[];

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
  data: Asset[];

  total?: number;

  page?: number;

  pageSize?: number;

  totalPages?: number;

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
// ASSET CATEGORY RESPONSE TYPES
// ============================================================

export interface AssetCategoriesResponse {
  data: AssetCategory[];

  message?: string;

  [key: string]: unknown;
}

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

  [key: string]: unknown;
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

  [key: string]: unknown;
}

// ============================================================
// ASSIGN ASSET
// ============================================================

export interface AssignAssetRequest {
  id: string;

  employeeId: string;

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

const BACKEND = "http://localhost:4000/api";

export const assetApi = createApi({
  reducerPath: "assetApi",

  baseQuery: fetchBaseQuery({
    baseUrl: BACKEND,

    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;

      // Keep state available for future auth implementation.
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
    "Asset",
    "AssetHistory",
    "AssetAssignment",
    "AssetTransfer",
    "SoftwareAsset",
    "AssetCategory",
    "Vendor",
  ],

  endpoints: (builder) => ({
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
        result?.data
          ? [
              ...result.data.map(({ id }) => ({
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
        result?.data
          ? [
              ...result.data.map(({ id }) => ({
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

    // ============================================================
    // ASSIGN
    // ============================================================

    assignAsset: builder.mutation<AssetResponse, AssignAssetRequest>({
      query: ({ id, ...body }) => ({
        url: `/assets/${id}/assign`,
        method: "POST",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
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

        "SoftwareAsset",
      ],
    }),

    // ============================================================
    // TRANSFER
    // ============================================================

    transferAsset: builder.mutation<AssetResponse, TransferAssetRequest>({
      query: ({ id, ...body }) => ({
        url: `/assets/${id}/transfer`,
        method: "POST",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
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

        "SoftwareAsset",
      ],
    }),

    // ============================================================
    // RETURN
    // ============================================================

    returnAsset: builder.mutation<AssetResponse, ReturnAssetRequest>({
      query: ({ id, notes }) => ({
        url: `/assets/${id}/return`,
        method: "POST",

        body: {
          notes,
        },
      }),

      invalidatesTags: (result, error, { id }) => [
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
  }),
});

// ============================================================
// HOOKS
// ============================================================

export const {
  // Assets
  useGetAssetsQuery,
  useGetAssetQuery,
  useGetAssetHistoryQuery,

  useCreateAssetMutation,
  useUpdateAssetMutation,

  useAssignAssetMutation,
  useTransferAssetMutation,
  useReturnAssetMutation,

  // Software
  useGetSoftwareAssetsQuery,

  // Categories
  useGetAssetCategoriesQuery,
  useGetAssetCategoryQuery,

  useCreateAssetCategoryMutation,
  useUpdateAssetCategoryMutation,

  useToggleAssetCategoryMutation,
  useDeleteAssetCategoryMutation,
} = assetApi;

export default assetApi;
