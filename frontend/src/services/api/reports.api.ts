import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store";
import { BACKEND } from "../../lib/api";

// ============================================================
// TYPES
// ============================================================

export interface ReportFilters {
  organisationId?: string;
  kind?: string;
  categoryId?: string;
  locationId?: string;
  from?: string;
  to?: string;
}

// ============================================================
// ASSET REPORT
// GET /reports/assets
// ============================================================

export interface AssetReportItem {
  id: string;
  assetTag?: string;
  name?: string;
  kind?: string;
  status?: string;
  condition?: string;
  purchasePrice?: number | string | null;
  purchaseDate?: string | null;

  category?: {
    id?: string;
    name?: string;
    [key: string]: unknown;
  } | null;

  vendor?: {
    id?: string;
    name?: string;
    [key: string]: unknown;
  } | null;

  location?: {
    id?: string;
    name?: string;
    [key: string]: unknown;
  } | null;

  [key: string]: unknown;
}

export interface AssetReportResponse {
  generatedAt: string;
  totalAssets: number;
  totalValue: number;
  byKind: Record<string, number>;
  items: AssetReportItem[];
}

// ============================================================
// INVENTORY REPORT
// GET /reports/inventory
// ============================================================

export interface InventoryReportItem {
  id: string;
  assetTag?: string;
  name?: string;
  category?: string | null;
  quantity: number;
  quantityAssigned: number;
  quantityAvailable: number;
  belowReorderLevel: boolean;
}

export interface InventoryReportResponse {
  generatedAt: string;
  totalSkus: number;
  totalQuantity: number;
  totalAssigned: number;
  totalAvailable: number;
  lowStockCount: number;
  items: InventoryReportItem[];
}

// ============================================================
// ASSIGNED REPORT
// GET /reports/assigned
// ============================================================

export interface AssignedReportItem {
  id: string;
  assetTag?: string;
  name?: string;
  category?: string | null;
  assignedTo?: string | null;
  assignedAt?: string | null;
}

export interface AssignedReportResponse {
  generatedAt: string;
  totalAssigned: number;
  items: AssignedReportItem[];
}

// ============================================================
// DAMAGED REPORT
// GET /reports/damaged
// ============================================================

export interface DamagedReportItem {
  id: string;
  assetTag?: string;
  name?: string;
  status?: string;
  condition?: string;
  location?: string | null;
  notes?: string | null;
}

export interface DamagedReportResponse {
  generatedAt: string;
  totalDamaged: number;
  items: DamagedReportItem[];
}

// ============================================================
// STATUS REPORT
// GET /reports/by-status
// ============================================================

export interface StatusReportBreakdown {
  status: string;
  count: number;
}

export interface StatusReportResponse {
  generatedAt: string;
  total: number;
  breakdown: StatusReportBreakdown[];
}

// ============================================================
// REPORTS API
// ============================================================

export const reportsApi = createApi({
  reducerPath: "reportsApi",

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

  tagTypes: ["Report"],

  endpoints: (builder) => ({
    // ========================================================
    // ASSET REPORT
    // GET /reports/assets
    // ========================================================

    getAssetReport: builder.query<AssetReportResponse, ReportFilters>({
      query: (filters = {}) => ({
        url: "/reports/assets",
        method: "GET",
        params: filters,
      }),

      providesTags: [{ type: "Report", id: "ASSETS" }],
    }),

    // ========================================================
    // INVENTORY REPORT
    // GET /reports/inventory
    // ========================================================

    getInventoryReport: builder.query<InventoryReportResponse, ReportFilters>({
      query: (filters = {}) => ({
        url: "/reports/inventory",
        method: "GET",
        params: filters,
      }),

      providesTags: [{ type: "Report", id: "INVENTORY" }],
    }),

    // ========================================================
    // ASSIGNED REPORT
    // GET /reports/assigned
    // ========================================================

    getAssignedReport: builder.query<AssignedReportResponse, ReportFilters>({
      query: (filters = {}) => ({
        url: "/reports/assigned",
        method: "GET",
        params: filters,
      }),

      providesTags: [{ type: "Report", id: "ASSIGNED" }],
    }),

    // ========================================================
    // DAMAGED REPORT
    // GET /reports/damaged
    // ========================================================

    getDamagedReport: builder.query<DamagedReportResponse, ReportFilters>({
      query: (filters = {}) => ({
        url: "/reports/damaged",
        method: "GET",
        params: filters,
      }),

      providesTags: [{ type: "Report", id: "DAMAGED" }],
    }),

    // ========================================================
    // REPORT BY STATUS
    // GET /reports/by-status
    // ========================================================

    getReportByStatus: builder.query<StatusReportResponse, ReportFilters>({
      query: (filters = {}) => ({
        url: "/reports/by-status",
        method: "GET",
        params: filters,
      }),

      providesTags: [{ type: "Report", id: "BY_STATUS" }],
    }),
  }),
});

// ============================================================
// HOOKS
// ============================================================

export const {
  useGetAssetReportQuery,
  useGetInventoryReportQuery,
  useGetAssignedReportQuery,
  useGetDamagedReportQuery,
  useGetReportByStatusQuery,
} = reportsApi;

export default reportsApi;
