import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";

// ============================================================
// TYPES
// ============================================================

export type AssetKind =
  | "HARDWARE"
  | "SOFTWARE"
  | "hardware"
  | "software"
  | "accessory"
  | "other"
  | string;

export type AssetStatus =
  | "available"
  | "assigned"
  | "maintenance"
  | "retired"
  | "lost"
  | string;

export type AssetCondition =
  | "new"
  | "good"
  | "fair"
  | "poor"
  | "damaged"
  | string;

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

  [key: string]: unknown;
}

// ============================================================
// ASSET
// ============================================================

export interface Asset {
  id: string;

  name?: string;
  assetTag?: string;
  serialNumber?: string;

  kind?: AssetKind;
  status?: AssetStatus;
  condition?: AssetCondition;

  organisationId?: string;
  categoryId?: string;
  locationId?: string;

  assignedTo?: string;
  assignedEmployeeId?: string;

  purchaseDate?: string;
  purchasePrice?: number;

  notes?: string;

  createdAt?: string;
  updatedAt?: string;

  category?: AssetCategory;

  [key: string]: unknown;
}

// ============================================================
// ASSET HISTORY
// ============================================================

export interface AssetHistory {
  id: string;
  assetId: string;

  action?: string;
  notes?: string;

  fromEmployeeId?: string;
  toEmployeeId?: string;

  fromLocationId?: string;
  toLocationId?: string;

  createdAt?: string;
  updatedAt?: string;

  [key: string]: unknown;
}

// ============================================================
// SOFTWARE ASSET
// ============================================================

export interface SoftwareAsset extends Asset {
  licenseKey?: string;
  licenseType?: string;
  expiryDate?: string;
  seats?: number;
  usedSeats?: number;
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

export interface SoftwareAssetsResponse {
  data?: SoftwareAsset[];
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
// ASSET CATEGORY REQUEST TYPES
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

  isActive?: boolean;
}

export interface GetAssetCategoriesParams {
  organisationId?: string;

  type?: AssetKind;

  isActive?: boolean;
}

// ============================================================
// QUERY PARAMS
// ============================================================

export interface GetAssetsParams {
  search?: string;
  organisationId?: string;
  kind?: AssetKind;
  status?: AssetStatus;
  condition?: AssetCondition;

  categoryId?: string;
  locationId?: string;

  assigned?: boolean;

  sortBy?: string;
  sortDir?: "ASC" | "DESC" | "asc" | "desc";

  page?: number;
  pageSize?: number;
}

// ============================================================
// MUTATION TYPES
// ============================================================

export interface CreateAssetRequest {
  name?: string;
  assetTag?: string;
  serialNumber?: string;

  kind?: AssetKind;
  status?: AssetStatus;
  condition?: AssetCondition;

  organisationId?: string;
  categoryId?: string;
  locationId?: string;

  [key: string]: unknown;
}

export interface UpdateAssetRequest {
  id: string;

  name?: string;
  assetTag?: string;
  serialNumber?: string;

  kind?: AssetKind;
  status?: AssetStatus;
  condition?: AssetCondition;

  organisationId?: string;
  categoryId?: string;
  locationId?: string;

  [key: string]: unknown;
}

export interface AssignAssetRequest {
  id: string;

  employeeId?: string;
  assignedTo?: string;

  notes?: string;

  [key: string]: unknown;
}

export interface TransferAssetRequest {
  id: string;

  employeeId?: string;
  assignedTo?: string;

  fromLocationId?: string;
  locationId?: string;

  notes?: string;

  [key: string]: unknown;
}

export interface ReturnAssetRequest {
  id: string;
  notes?: string;
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

      const token = localStorage.getItem("accessToken");

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      headers.set("Content-Type", "application/json");

      return headers;
    },
  }),

  tagTypes: ["Asset", "AssetHistory", "SoftwareAsset", "AssetCategory"],

  endpoints: (builder) => ({
    // ============================================================
    // ASSET CATEGORIES
    // ============================================================

    // GET /asset-categories
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

    // ============================================================
    // GET SINGLE CATEGORY
    // GET /asset-categories/:id
    // ============================================================

    getAssetCategory: builder.query<AssetCategoryResponse, string>({
      query: (id) => `/asset-categories/${id}`,

      providesTags: (result, error, id) => [
        {
          type: "AssetCategory" as const,
          id,
        },
      ],
    }),

    // ============================================================
    // CREATE CATEGORY
    // POST /asset-categories
    // ============================================================

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

        "Asset",
      ],
    }),

    // ============================================================
    // UPDATE CATEGORY
    // PATCH /asset-categories/:id
    // ============================================================

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
          type: "AssetCategory" as const,
          id,
        },

        {
          type: "AssetCategory" as const,
          id: "LIST",
        },

        "Asset",
      ],
    }),

    // ============================================================
    // TOGGLE CATEGORY ACTIVE
    // PATCH /asset-categories/:id/toggle-active
    // ============================================================

    toggleAssetCategory: builder.mutation<AssetCategoryResponse, string>({
      query: (id) => ({
        url: `/asset-categories/${id}/toggle-active`,
        method: "PATCH",
      }),

      invalidatesTags: (result, error, id) => [
        {
          type: "AssetCategory" as const,
          id,
        },

        {
          type: "AssetCategory" as const,
          id: "LIST",
        },
      ],
    }),

    // ============================================================
    // DELETE CATEGORY
    // DELETE /asset-categories/:id
    // ============================================================

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

        "Asset",
      ],
    }),

    // ============================================================
    // GET ALL ASSETS
    // GET /assets
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

    // ============================================================
    // GET SINGLE ASSET
    // GET /assets/:id
    // ============================================================

    getAsset: builder.query<AssetResponse, string>({
      query: (id) => `/assets/${id}`,

      providesTags: (result, error, id) => [
        {
          type: "Asset" as const,
          id,
        },
      ],
    }),

    // ============================================================
    // GET ASSET HISTORY
    // GET /assets/:id/history
    // ============================================================

    getAssetHistory: builder.query<AssetHistoryResponse, string>({
      query: (id) => `/assets/${id}/history`,

      providesTags: (result, error, id) => [
        {
          type: "AssetHistory" as const,
          id,
        },
      ],
    }),

    // ============================================================
    // CREATE ASSET
    // POST /assets
    // ============================================================

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
        "AssetCategory",
      ],
    }),

    // ============================================================
    // UPDATE ASSET
    // PATCH /assets/:id
    // ============================================================

    updateAsset: builder.mutation<AssetResponse, UpdateAssetRequest>({
      query: ({ id, ...body }) => ({
        url: `/assets/${id}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        {
          type: "Asset" as const,
          id,
        },

        {
          type: "Asset" as const,
          id: "LIST",
        },

        "SoftwareAsset",
        "AssetCategory",
      ],
    }),

    // ============================================================
    // ASSIGN ASSET
    // POST /assets/:id/assign
    // ============================================================

    assignAsset: builder.mutation<AssetResponse, AssignAssetRequest>({
      query: ({ id, ...body }) => ({
        url: `/assets/${id}/assign`,
        method: "POST",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        {
          type: "Asset" as const,
          id,
        },

        {
          type: "AssetHistory" as const,
          id,
        },

        {
          type: "Asset" as const,
          id: "LIST",
        },

        "SoftwareAsset",
      ],
    }),

    // ============================================================
    // TRANSFER ASSET
    // POST /assets/:id/transfer
    // ============================================================

    transferAsset: builder.mutation<AssetResponse, TransferAssetRequest>({
      query: ({ id, ...body }) => ({
        url: `/assets/${id}/transfer`,
        method: "POST",
        body,
      }),

      invalidatesTags: (result, error, { id }) => [
        {
          type: "Asset" as const,
          id,
        },

        {
          type: "AssetHistory" as const,
          id,
        },

        {
          type: "Asset" as const,
          id: "LIST",
        },

        "SoftwareAsset",
      ],
    }),

    // ============================================================
    // RETURN ASSET
    // POST /assets/:id/return
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
          type: "Asset" as const,
          id,
        },

        {
          type: "AssetHistory" as const,
          id,
        },

        {
          type: "Asset" as const,
          id: "LIST",
        },

        "SoftwareAsset",
      ],
    }),

    // ============================================================
    // GET SOFTWARE ASSETS
    // GET /assets/software
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

  // Asset Categories
  useGetAssetCategoriesQuery,
  useGetAssetCategoryQuery,

  useCreateAssetCategoryMutation,
  useUpdateAssetCategoryMutation,

  useToggleAssetCategoryMutation,
  useDeleteAssetCategoryMutation,
} = assetApi;

export default assetApi;
