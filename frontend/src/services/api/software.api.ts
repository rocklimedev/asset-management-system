import { assetApi } from "./asset.api";
import type { Asset, SystemRecord } from "./asset.api";

// ============================================================
// ENUMS
// ============================================================

export type SoftwareUsage =
  | "IN_USE"
  | "NOT_IN_USE"
  | "OCCASIONAL"
  | "TRIAL"
  | "BLOCKED"
  | "UNKNOWN";

export type SoftwareSubscriptionType =
  | "OPEN_SOURCE"
  | "FREE"
  | "SUBSCRIPTION"
  | "PERPETUAL"
  | "TRIAL"
  | "COMPANY_LICENSE"
  | "UNKNOWN";

export type SoftwareInstallationStatus =
  | "INSTALLED"
  | "NOT_INSTALLED"
  | "UNINSTALLED"
  | "BLOCKED"
  | "UNKNOWN";

export type SoftwareAssignmentStatus = "ACTIVE" | "REMOVED";

export const SOFTWARE_USAGE_OPTIONS: { value: SoftwareUsage; label: string }[] =
  [
    { value: "IN_USE", label: "In use" },
    { value: "NOT_IN_USE", label: "Not in use" },
    { value: "OCCASIONAL", label: "Occasional" },
    { value: "TRIAL", label: "Trial" },
    { value: "BLOCKED", label: "Blocked" },
    { value: "UNKNOWN", label: "Unknown" },
  ];

export const SOFTWARE_SUBSCRIPTION_OPTIONS: {
  value: SoftwareSubscriptionType;
  label: string;
}[] = [
  { value: "OPEN_SOURCE", label: "Open source" },
  { value: "FREE", label: "Free" },
  { value: "SUBSCRIPTION", label: "Subscription" },
  { value: "PERPETUAL", label: "Perpetual" },
  { value: "TRIAL", label: "Trial" },
  { value: "COMPANY_LICENSE", label: "Company license" },
  { value: "UNKNOWN", label: "Unknown" },
];

/** Subscription types that normally need a license record. */
export const LICENSED_SUBSCRIPTION_TYPES: SoftwareSubscriptionType[] = [
  "SUBSCRIPTION",
  "PERPETUAL",
  "COMPANY_LICENSE",
];

// ============================================================
// RECORDS
// ============================================================

export interface SoftwareRecord {
  id: string;
  assetId: string;
  parentSoftwareId: string | null;
  usage: SoftwareUsage;
  subscriptionType: SoftwareSubscriptionType;
  warrantyApplicable: boolean;
  version: string | null;
  edition: string | null;
  publisher: string | null;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;

  asset?: Asset;
  parentSoftware?: Asset | null;

  /** Only present on list responses */
  activeInstallations?: number;
}

export interface SoftwareLicenseRecord {
  id: string;
  assetId: string;
  vendor: string;
  licenseType: string;
  licenseReference?: string | null;
  totalSeats: number;
  assignedSeats: number;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  renewalDate?: string | null;
  cost?: number | null;
  asset?: Asset;
  createdAt?: string;
  updatedAt?: string;
}

export interface SoftwareInstallation {
  id: string;
  assetId: string;
  licenseId?: string | null;
  systemId: string;
  installationStatus: SoftwareInstallationStatus;
  assignmentStatus: SoftwareAssignmentStatus;
  version?: string | null;
  installedAt?: string | null;
  removedAt?: string | null;
  notes?: string | null;

  asset?: {
    id: string;
    name: string;
    assetTag?: string | null;
    kind?: string;
    status?: string;
    // ...other asset fields as needed
  };
  softwareAsset?: {
    id: string;
    name: string;
    assetTag?: string | null;
    kind?: string;
    status?: string;
    // ...
  };
  license?: SoftwareLicenseRecord | null;
  system?: SystemRecord;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SoftwareListResponse {
  data: SoftwareRecord[];
  pagination: Pagination;
}

export interface LicenseUsage {
  license: SoftwareLicenseRecord;
  totalSeats: number;
  assignedSeats: number;
  availableSeats: number;
  overAllocatedBy: number;
  utilisationPercent: number;
  isExpired: boolean;
  daysToExpiry: number | null;
  assignments: SoftwareInstallation[];
}

export interface SoftwareTreeNode {
  softwareId: string;
  assetId: string;
  name?: string;
  assetTag?: string | null;
  version: string | null;
  edition: string | null;
  publisher: string | null;
  usage: SoftwareUsage;
  subscriptionType: SoftwareSubscriptionType;
  children: SoftwareTreeNode[];
}

export interface SoftwareSummary {
  software: {
    total: number;
    byUsage: Record<string, number>;
    bySubscriptionType: Record<string, number>;
    withoutActiveInstallations: number;
  };
  installations: { active: number; distinctSoftware: number };
  licenses: {
    total: number;
    totalSeats: number;
    assignedSeats: number;
    expired: number;
    expiringSoon: number;
    fullyUtilised: number;
  };
}

export interface SoftwareComplianceReport {
  generatedAt: string;
  totals: {
    expiredLicenseInstalls: number;
    unlicensedInstalls: number;
    blockedInstalls: number;
    orphanedInstalls: number;
    inactiveEmployeeInstalls: number;
    overAllocatedLicenses: number;
    seatCountMismatches: number;
  };
  expiredLicenseInstalls: SoftwareInstallation[];
  unlicensedInstalls: SoftwareInstallation[];
  blockedInstalls: SoftwareInstallation[];
  orphanedInstalls: SoftwareInstallation[];
  inactiveEmployeeInstalls: SoftwareInstallation[];
  overAllocatedLicenses: {
    license: SoftwareLicenseRecord;
    used: number;
    total: number;
  }[];
  seatCountMismatches: { licenseId: string; stored: number; actual: number }[];
}

export interface SoftwareUsersResponse {
  softwareAssetId: string;
  totalInstallations: number;
  totalUsers: number;
  users: { employee: { id: string; name?: string }; systems: SystemRecord[] }[];
}

export interface BulkAssignResult {
  requested: number;
  succeeded: number;
  failed: number;
  assignmentIds: string[];
  errors: { systemId: string; reason: string }[];
}

// ============================================================
// REQUESTS
// ============================================================

export interface SoftwareListParams {
  search?: string;
  usage?: SoftwareUsage;
  subscriptionType?: SoftwareSubscriptionType;
  parentSoftwareId?: string;
  publisher?: string;
  rootOnly?: boolean;
  sortBy?: "createdAt" | "name" | "publisher";
  sortDir?: "ASC" | "DESC";
  page?: number;
  limit?: number;
}

export interface CreateSoftwareRequest {
  assetId: string;
  parentSoftwareId?: string | null;
  usage?: SoftwareUsage;
  subscriptionType?: SoftwareSubscriptionType;
  warrantyApplicable?: boolean;
  version?: string | null;
  edition?: string | null;
  publisher?: string | null;
  notes?: string | null;
}

export type UpdateSoftwareRequest = { id: string } & Partial<
  Omit<CreateSoftwareRequest, "assetId">
>;

export interface CreateLicenseRequest {
  assetId: string;
  vendor: string;
  licenseType: string;
  licenseReference?: string | null;
  totalSeats?: number;
  purchaseDate?: string | null;
  expiryDate?: string | null;
  renewalDate?: string | null;
  cost?: number | null;
}

export type UpdateLicenseRequest = { id: string } & Partial<
  Omit<CreateLicenseRequest, "assetId">
>;

export interface RenewLicenseRequest {
  id: string;
  expiryDate: string;
  renewalDate?: string | null;
  cost?: number | null;
  totalSeats?: number;
}

export interface LicenseListParams {
  assetId?: string;
  expired?: boolean;
  expiringInDays?: number;
  hasFreeSeats?: boolean;
}

export interface AssignSoftwareRequest {
  softwareAssetId: string;
  systemId: string;
  softwareLicenseId?: string | null;
  autoAllocateLicense?: boolean;
  version?: string | null;
  installationStatus?: SoftwareInstallationStatus;
  notes?: string | null;
}

export interface BulkAssignSoftwareRequest {
  softwareAssetId: string;
  systemIds: string[];
  softwareLicenseId?: string | null;
  autoAllocateLicense?: boolean;
  version?: string | null;
  notes?: string | null;
}

export interface UpdateInstallationRequest {
  id: string;
  version?: string | null;
  installationStatus?: SoftwareInstallationStatus;
  softwareLicenseId?: string | null;
  notes?: string | null;
}

export interface InstallationListParams {
  softwareAssetId?: string;
  systemId?: string;
  employeeId?: string;
  licenseId?: string;
  status?: SoftwareAssignmentStatus;
  installationStatus?: SoftwareInstallationStatus;
}

// ============================================================
// HELPERS
// ============================================================

function clean<T extends object>(params?: T | void) {
  if (!params) return undefined;

  return Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== "",
    ),
  );
}

type SoftwareTag =
  | "Software"
  | "SoftwareLicense"
  | "SoftwareInstallation"
  | "SoftwareReport"
  | "System";

/** Anything that installs/removes/changes seats touches all of these. */
const installTags = (): SoftwareTag[] => [
  "Software",
  "SoftwareLicense",
  "SoftwareInstallation",
  "SoftwareReport",
  "System",
];

const catalogTags = (): SoftwareTag[] => ["Software", "SoftwareReport"];

const licenseTags = (): SoftwareTag[] => [
  "Software",
  "SoftwareLicense",
  "SoftwareReport",
];

// ============================================================
// API (injected into assetApi so no store changes are needed)
// ============================================================

const baseApi = assetApi.enhanceEndpoints({
  addTagTypes: [
    "Software",
    "SoftwareLicense",
    "SoftwareInstallation",
    "SoftwareReport",
  ],
});

export const softwareApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ==========================================================
    // CATALOG
    // ==========================================================

    getSoftwareList: builder.query<
      SoftwareListResponse,
      SoftwareListParams | void
    >({
      query: (params) => ({ url: "/software", params: clean(params) }),
      providesTags: ["Software"],
    }),

    getSoftwareDetails: builder.query<SoftwareRecord, string>({
      query: (id) => `/software/${id}`,
      providesTags: ["Software"],
    }),

    getSoftwareByAsset: builder.query<SoftwareRecord, string>({
      query: (assetId) => `/software/asset/${assetId}`,
      providesTags: ["Software"],
    }),

    createSoftware: builder.mutation<SoftwareRecord, CreateSoftwareRequest>({
      query: (body) => ({ url: "/software", method: "POST", body }),
      invalidatesTags: catalogTags,
    }),

    updateSoftware: builder.mutation<SoftwareRecord, UpdateSoftwareRequest>({
      query: ({ id, ...body }) => ({
        url: `/software/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: catalogTags,
    }),

    deleteSoftware: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({ url: `/software/${id}`, method: "DELETE" }),
      invalidatesTags: catalogTags,
    }),

    bulkUpdateSoftwareUsage: builder.mutation<
      { success: boolean; affected: number },
      { ids: string[]; usage: SoftwareUsage }
    >({
      query: (body) => ({ url: "/software/bulk/usage", method: "PATCH", body }),
      invalidatesTags: catalogTags,
    }),

    // ==========================================================
    // HIERARCHY / USERS
    // ==========================================================

    getSoftwareHierarchy: builder.query<SoftwareTreeNode[], void>({
      query: () => "/software/hierarchy",
      providesTags: ["Software"],
    }),

    getSoftwareChildren: builder.query<SoftwareRecord[], string>({
      query: (assetId) => `/software/asset/${assetId}/children`,
      providesTags: ["Software"],
    }),

    getSoftwareUsers: builder.query<SoftwareUsersResponse, string>({
      query: (assetId) => `/software/asset/${assetId}/users`,
      providesTags: ["SoftwareInstallation"],
    }),

    // ==========================================================
    // LICENSES
    // ==========================================================

    getSoftwareLicenses: builder.query<
      SoftwareLicenseRecord[],
      LicenseListParams | void
    >({
      query: (params) => ({ url: "/software/licenses", params: clean(params) }),
      providesTags: ["SoftwareLicense"],
    }),

    getSoftwareLicenseUsage: builder.query<LicenseUsage, string>({
      query: (id) => `/software/licenses/${id}/usage`,
      providesTags: ["SoftwareLicense", "SoftwareInstallation"],
    }),

    createSoftwareLicense: builder.mutation<
      SoftwareLicenseRecord,
      CreateLicenseRequest
    >({
      query: (body) => ({ url: "/software/licenses", method: "POST", body }),
      invalidatesTags: licenseTags,
    }),

    updateSoftwareLicense: builder.mutation<
      SoftwareLicenseRecord,
      UpdateLicenseRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/software/licenses/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: licenseTags,
    }),

    renewSoftwareLicense: builder.mutation<
      SoftwareLicenseRecord,
      RenewLicenseRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/software/licenses/${id}/renew`,
        method: "POST",
        body,
      }),
      invalidatesTags: licenseTags,
    }),

    deleteSoftwareLicense: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({ url: `/software/licenses/${id}`, method: "DELETE" }),
      invalidatesTags: installTags,
    }),

    recalculateSoftwareSeats: builder.mutation<
      { checked: number; corrected: number },
      { licenseId?: string } | void
    >({
      query: (body) => ({
        url: "/software/licenses/recalculate-seats",
        method: "POST",
        body: body || {},
      }),
      invalidatesTags: licenseTags,
    }),

    // ==========================================================
    // INSTALLATIONS (Software -> System -> Employee)
    // ==========================================================

    getSoftwareInstallations: builder.query<
      SoftwareInstallation[],
      InstallationListParams | void
    >({
      query: (params) => ({
        url: "/software/assignments",
        params: clean(params),
      }),
      providesTags: ["SoftwareInstallation"],
    }),

    getSystemSoftware: builder.query<SoftwareInstallation[], string>({
      query: (systemId) => `/software/systems/${systemId}`,
      providesTags: ["SoftwareInstallation"],
    }),

    getEmployeeSoftware: builder.query<SoftwareInstallation[], string>({
      query: (employeeId) => `/software/employees/${employeeId}`,
      providesTags: ["SoftwareInstallation"],
    }),

    assignSoftware: builder.mutation<
      SoftwareInstallation,
      AssignSoftwareRequest
    >({
      query: (body) => ({ url: "/software/assign", method: "POST", body }),
      invalidatesTags: installTags,
    }),

    assignSoftwareWithChildren: builder.mutation<
      SoftwareInstallation[],
      AssignSoftwareRequest
    >({
      query: (body) => ({
        url: "/software/assign/with-children",
        method: "POST",
        body,
      }),
      invalidatesTags: installTags,
    }),

    bulkAssignSoftware: builder.mutation<
      BulkAssignResult,
      BulkAssignSoftwareRequest
    >({
      query: (body) => ({ url: "/software/assign/bulk", method: "POST", body }),
      invalidatesTags: installTags,
    }),

    updateSoftwareInstallation: builder.mutation<
      SoftwareInstallation,
      UpdateInstallationRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/software/assignments/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: installTags,
    }),

    removeSoftwareInstallation: builder.mutation<
      SoftwareInstallation,
      { id: string; notes?: string }
    >({
      query: ({ id, notes }) => ({
        url: `/software/assignments/${id}/remove`,
        method: "POST",
        body: { notes },
      }),
      invalidatesTags: installTags,
    }),

    transferSoftwareInstallation: builder.mutation<
      SoftwareInstallation,
      { id: string; toSystemId: string; notes?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/software/assignments/${id}/transfer`,
        method: "POST",
        body,
      }),
      invalidatesTags: installTags,
    }),

    removeAllSoftwareFromSystem: builder.mutation<
      { success: boolean; removed: number },
      { systemId: string; notes?: string }
    >({
      query: ({ systemId, notes }) => ({
        url: `/software/systems/${systemId}/unassign-all`,
        method: "POST",
        body: { notes },
      }),
      invalidatesTags: installTags,
    }),

    // ==========================================================
    // REPORTS
    // ==========================================================

    getSoftwareSummary: builder.query<SoftwareSummary, number | void>({
      query: (days) => ({
        url: "/software/reports/summary",
        params: days ? { days } : undefined,
      }),
      providesTags: ["SoftwareReport"],
    }),

    getUnusedSoftware: builder.query<SoftwareRecord[], void>({
      query: () => "/software/reports/unused",
      providesTags: ["SoftwareReport"],
    }),

    getSoftwareCompliance: builder.query<SoftwareComplianceReport, void>({
      query: () => "/software/reports/compliance",
      providesTags: ["SoftwareReport"],
    }),
  }),
});

export const {
  // Catalog
  useGetSoftwareListQuery,
  useGetSoftwareDetailsQuery,
  useGetSoftwareByAssetQuery,
  useCreateSoftwareMutation,
  useUpdateSoftwareMutation,
  useDeleteSoftwareMutation,
  useBulkUpdateSoftwareUsageMutation,

  // Hierarchy / users
  useGetSoftwareHierarchyQuery,
  useGetSoftwareChildrenQuery,
  useGetSoftwareUsersQuery,

  // Licenses
  useGetSoftwareLicensesQuery,
  useGetSoftwareLicenseUsageQuery,
  useCreateSoftwareLicenseMutation,
  useUpdateSoftwareLicenseMutation,
  useRenewSoftwareLicenseMutation,
  useDeleteSoftwareLicenseMutation,
  useRecalculateSoftwareSeatsMutation,

  // Installations
  useGetSoftwareInstallationsQuery,
  useGetSystemSoftwareQuery,
  useGetEmployeeSoftwareQuery,
  useAssignSoftwareMutation,
  useAssignSoftwareWithChildrenMutation,
  useBulkAssignSoftwareMutation,
  useUpdateSoftwareInstallationMutation,
  useRemoveSoftwareInstallationMutation,
  useTransferSoftwareInstallationMutation,
  useRemoveAllSoftwareFromSystemMutation,

  // Reports
  useGetSoftwareSummaryQuery,
  useGetUnusedSoftwareQuery,
  useGetSoftwareComplianceQuery,
} = softwareApi;

export default softwareApi;
