import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { BACKEND } from '../../lib/api';

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
  urgency: 'red' | 'yellow' | string;
}

export interface WarrantyExpiration {
  assetName: string;
  assetTag: string;
  warrantyExpiry: string;
  urgency: 'red' | 'yellow' | string;
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
// CACHE CONFIGURATION
// ============================================================

const DASHBOARD_CACHE_CONFIG = {
  // Keep dashboard data for 3 minutes (dashboard updates frequently)
  keepUnusedDataFor: 3 * 60,

  // ✅ FIX: Refetch when window regains focus (user comes back to tab)
  refetchOnFocus: true,

  // ✅ FIX: Refetch when network reconnects
  refetchOnReconnect: true,

  // Don't auto-refetch on every mount if data exists
  refetchOnMountOrArgChange: false,
};

// ============================================================
// DASHBOARD API
// ============================================================

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',

  baseQuery: fetchBaseQuery({
    baseUrl: BACKEND,

    // ✅ FIX: Add request timeout
    timeout: 30000,

    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');

      const token = localStorage.getItem('accessToken');

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      // ✅ FIX: Add compression headers
      headers.set('Accept-Encoding', 'gzip, deflate');

      return headers;
    },
  }),

  tagTypes: ['Dashboard'],

  endpoints: (builder) => ({
    // ============================================================
    // GET DASHBOARD
    // GET /dashboard
    // ============================================================

    getDashboard: builder.query<DashboardResponse, void>({
      query: () => '/dashboard',
      providesTags: ['Dashboard'],

      // ✅ FIX: Add cache configuration for real-time updates
      ...DASHBOARD_CACHE_CONFIG,
    }),
  }),
});

// ============================================================
// HOOKS
// ============================================================

export const { useGetDashboardQuery } = dashboardApi;

export default dashboardApi;
