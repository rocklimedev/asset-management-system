import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// ============================================================
// TYPES
// ============================================================

export interface DashboardCards {
  totalAssets: number;
  assignedAssets: number;
  unassignedAssets: number;
  employees: number;
  hardware: number;
  software: number;
  underRepair: number;
  expiringLicenses: number;
}

export interface AssetDistributionItem {
  status: string;
  count: number;
}

export interface BreakdownItem {
  category: string;
  count: number;
}

export interface RecentActivityItem {
  id: string;
  action: string;
  assetName: string;
  fromValue?: string;
  toValue?: string;
  createdAt: string;
  performedBy: string;
}

export interface LicenseExpiration {
  assetName: string;
  expiryDate: string;
  urgency: "red" | "yellow" | string;
}

export interface WarrantyExpiration {
  assetName: string;
  assetTag: string;
  warrantyExpiry: string;
  urgency: "red" | "yellow" | string;
}

export interface DashboardResponse {
  cards: DashboardCards;
  assetDistribution: AssetDistributionItem[];
  hardwareBreakdown: BreakdownItem[];
  softwareBreakdown: BreakdownItem[];
  recentActivity: RecentActivityItem[];
  upcoming: {
    licenseExpirations: LicenseExpiration[];
    warrantyExpirations: WarrantyExpiration[];
  };
}

// ============================================================
// CONFIG
// ============================================================

const BACKEND = "http://localhost:4000/api";

// ============================================================
// DASHBOARD API
// ============================================================

export const dashboardApi = createApi({
  reducerPath: "dashboardApi",

  baseQuery: fetchBaseQuery({
    baseUrl: BACKEND,

    // Read the token straight from localStorage — AuthContext is
    // the single source of truth now that authSlice is gone.
    prepareHeaders: (headers) => {
      headers.set("Content-Type", "application/json");

      const token = localStorage.getItem("accessToken");

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),

  tagTypes: ["Dashboard"],

  endpoints: (builder) => ({
    // ============================================================
    // GET DASHBOARD
    // GET /dashboard
    // ============================================================

    getDashboard: builder.query<DashboardResponse, void>({
      query: () => "/dashboard",
      providesTags: ["Dashboard"],
    }),
  }),
});

// ============================================================
// HOOKS
// ============================================================

export const { useGetDashboardQuery } = dashboardApi;

export default dashboardApi;
