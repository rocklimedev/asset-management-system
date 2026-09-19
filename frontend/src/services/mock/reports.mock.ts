/**
 * MOCK REPORTING DATA
 *
 * Every export here is shaped the way the real API is expected to return it,
 * so wiring up later means swapping these constants for query hooks and
 * deleting this file. Nothing else on the Reports page needs to change.
 */

// ============================================================
// SHARED TYPES
// ============================================================

export type ReportRange = "30d" | "90d" | "6m" | "12m";

export interface KpiSummary {
  totalAssets: number;
  assignedAssets: number;
  unassignedAssets: number;
  underRepair: number;
  retiredThisPeriod: number;
  utilisationRate: number;
  bookValue: number;
  deltaUtilisation: number;
  deltaTotalAssets: number;
  deltaBookValue: number;
}

export interface UtilisationPoint {
  period: string;
  assigned: number;
  available: number;
  repair: number;
  utilisation: number;
}

export interface DepartmentAllocation {
  department: string;
  hardware: number;
  software: number;
  headcount: number;
  costCentre: string;
}

export interface AgeingBucket {
  bucket: string;
  count: number;
  bookValue: number;
}

export interface DepreciationPoint {
  period: string;
  purchaseValue: number;
  bookValue: number;
  depreciation: number;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  value: number;
}

export type AuditAction =
  | "ASSIGNED"
  | "TRANSFERRED"
  | "RETURNED"
  | "REPAIR"
  | "RETIRED"
  | "CREATED";

export interface AuditEntry {
  id: string;
  timestamp: string;
  assetTag: string;
  assetName: string;
  action: AuditAction;
  actor: string;
  from: string | null;
  to: string | null;
  note: string;
}

export interface LicenceRenewal {
  id: string;
  product: string;
  vendor: string;
  seats: number;
  seatsUsed: number;
  renewalDate: string;
  annualCost: number;
}

// ============================================================
// KPI SUMMARY
// ============================================================

export const KPI_SUMMARY: Record<ReportRange, KpiSummary> = {
  "30d": {
    totalAssets: 1284,
    assignedAssets: 1016,
    unassignedAssets: 214,
    underRepair: 38,
    retiredThisPeriod: 16,
    utilisationRate: 79.1,
    bookValue: 42680000,
    deltaUtilisation: 2.4,
    deltaTotalAssets: 1.8,
    deltaBookValue: -3.1,
  },
  "90d": {
    totalAssets: 1284,
    assignedAssets: 1016,
    unassignedAssets: 214,
    underRepair: 38,
    retiredThisPeriod: 47,
    utilisationRate: 79.1,
    bookValue: 42680000,
    deltaUtilisation: 4.1,
    deltaTotalAssets: 5.2,
    deltaBookValue: -6.8,
  },
  "6m": {
    totalAssets: 1284,
    assignedAssets: 1016,
    unassignedAssets: 214,
    underRepair: 38,
    retiredThisPeriod: 94,
    utilisationRate: 79.1,
    bookValue: 42680000,
    deltaUtilisation: 6.3,
    deltaTotalAssets: 9.4,
    deltaBookValue: -11.2,
  },
  "12m": {
    totalAssets: 1284,
    assignedAssets: 1016,
    unassignedAssets: 214,
    underRepair: 38,
    retiredThisPeriod: 173,
    utilisationRate: 79.1,
    bookValue: 42680000,
    deltaUtilisation: 8.7,
    deltaTotalAssets: 14.6,
    deltaBookValue: -18.5,
  },
};

// ============================================================
// UTILISATION TREND
// ============================================================

export const UTILISATION_TREND: Record<ReportRange, UtilisationPoint[]> = {
  "30d": [
    { period: "Wk 1", assigned: 981, available: 249, repair: 41, utilisation: 77.2 },
    { period: "Wk 2", assigned: 994, available: 238, repair: 39, utilisation: 78.1 },
    { period: "Wk 3", assigned: 1007, available: 226, repair: 40, utilisation: 78.8 },
    { period: "Wk 4", assigned: 1016, available: 214, repair: 38, utilisation: 79.1 },
  ],
  "90d": [
    { period: "Apr", assigned: 942, available: 281, repair: 48, utilisation: 74.1 },
    { period: "May", assigned: 968, available: 262, repair: 44, utilisation: 76.0 },
    { period: "Jun", assigned: 1016, available: 214, repair: 38, utilisation: 79.1 },
  ],
  "6m": [
    { period: "Jan", assigned: 874, available: 312, repair: 52, utilisation: 70.6 },
    { period: "Feb", assigned: 896, available: 301, repair: 49, utilisation: 71.9 },
    { period: "Mar", assigned: 921, available: 292, repair: 51, utilisation: 72.9 },
    { period: "Apr", assigned: 942, available: 281, repair: 48, utilisation: 74.1 },
    { period: "May", assigned: 968, available: 262, repair: 44, utilisation: 76.0 },
    { period: "Jun", assigned: 1016, available: 214, repair: 38, utilisation: 79.1 },
  ],
  "12m": [
    { period: "Jul", assigned: 792, available: 348, repair: 61, utilisation: 65.9 },
    { period: "Aug", assigned: 808, available: 341, repair: 58, utilisation: 66.9 },
    { period: "Sep", assigned: 823, available: 336, repair: 56, utilisation: 67.8 },
    { period: "Oct", assigned: 841, available: 329, repair: 55, utilisation: 68.6 },
    { period: "Nov", assigned: 856, available: 322, repair: 54, utilisation: 69.5 },
    { period: "Dec", assigned: 869, available: 316, repair: 53, utilisation: 70.2 },
    { period: "Jan", assigned: 874, available: 312, repair: 52, utilisation: 70.6 },
    { period: "Feb", assigned: 896, available: 301, repair: 49, utilisation: 71.9 },
    { period: "Mar", assigned: 921, available: 292, repair: 51, utilisation: 72.9 },
    { period: "Apr", assigned: 942, available: 281, repair: 48, utilisation: 74.1 },
    { period: "May", assigned: 968, available: 262, repair: 44, utilisation: 76.0 },
    { period: "Jun", assigned: 1016, available: 214, repair: 38, utilisation: 79.1 },
  ],
};

// ============================================================
// ALLOCATION BY DEPARTMENT
// ============================================================

export const DEPARTMENT_ALLOCATION: DepartmentAllocation[] = [
  { department: "Engineering", hardware: 312, software: 486, headcount: 208, costCentre: "CC-1001" },
  { department: "Sales", hardware: 148, software: 214, headcount: 126, costCentre: "CC-2100" },
  { department: "Operations", hardware: 134, software: 121, headcount: 118, costCentre: "CC-3050" },
  { department: "Design", hardware: 86, software: 142, headcount: 54, costCentre: "CC-1400" },
  { department: "Finance", hardware: 62, software: 88, headcount: 41, costCentre: "CC-4000" },
  { department: "People & Culture", hardware: 44, software: 57, headcount: 29, costCentre: "CC-5000" },
  { department: "Support", hardware: 96, software: 104, headcount: 77, costCentre: "CC-3200" },
];

// ============================================================
// LIFECYCLE / AGEING
// ============================================================

export const AGEING_BUCKETS: AgeingBucket[] = [
  { bucket: "0–12 months", count: 318, bookValue: 18420000 },
  { bucket: "1–2 years", count: 402, bookValue: 14260000 },
  { bucket: "2–3 years", count: 286, bookValue: 6840000 },
  { bucket: "3–4 years", count: 174, bookValue: 2510000 },
  { bucket: "4+ years", count: 104, bookValue: 650000 },
];

// ============================================================
// VALUE & DEPRECIATION
// ============================================================

export const DEPRECIATION_TREND: DepreciationPoint[] = [
  { period: "Jul", purchaseValue: 58200000, bookValue: 49100000, depreciation: 9100000 },
  { period: "Aug", purchaseValue: 58900000, bookValue: 48400000, depreciation: 10500000 },
  { period: "Sep", purchaseValue: 59600000, bookValue: 47600000, depreciation: 12000000 },
  { period: "Oct", purchaseValue: 60800000, bookValue: 46900000, depreciation: 13900000 },
  { period: "Nov", purchaseValue: 61400000, bookValue: 46100000, depreciation: 15300000 },
  { period: "Dec", purchaseValue: 62100000, bookValue: 45300000, depreciation: 16800000 },
  { period: "Jan", purchaseValue: 63400000, bookValue: 44800000, depreciation: 18600000 },
  { period: "Feb", purchaseValue: 64100000, bookValue: 44200000, depreciation: 19900000 },
  { period: "Mar", purchaseValue: 65300000, bookValue: 43800000, depreciation: 21500000 },
  { period: "Apr", purchaseValue: 66200000, bookValue: 43400000, depreciation: 22800000 },
  { period: "May", purchaseValue: 67100000, bookValue: 43000000, depreciation: 24100000 },
  { period: "Jun", purchaseValue: 68400000, bookValue: 42680000, depreciation: 25720000 },
];

// ============================================================
// CATEGORY BREAKDOWN
// ============================================================

export const CATEGORY_BREAKDOWN: CategoryBreakdown[] = [
  { category: "Laptops", count: 486, value: 21400000 },
  { category: "Monitors", count: 312, value: 5860000 },
  { category: "Mobile devices", count: 178, value: 6240000 },
  { category: "Peripherals", count: 164, value: 1180000 },
  { category: "Networking", count: 88, value: 4320000 },
  { category: "Servers", count: 56, value: 3680000 },
];

// ============================================================
// AUDIT TRAIL
// ============================================================

export const AUDIT_TRAIL: AuditEntry[] = [
  { id: "AUD-4821", timestamp: "2026-09-18T14:32:00+05:30", assetTag: "LAP-0421", assetName: 'MacBook Pro 14"', action: "TRANSFERRED", actor: "Nisha Rawat", from: "Arjun Mehta", to: "Kavya Iyer", note: "Team reassignment" },
  { id: "AUD-4820", timestamp: "2026-09-18T11:04:00+05:30", assetTag: "MON-1188", assetName: "Dell U2723QE", action: "ASSIGNED", actor: "Nisha Rawat", from: null, to: "Rohit Saxena", note: "New joiner kit" },
  { id: "AUD-4819", timestamp: "2026-09-17T17:48:00+05:30", assetTag: "LAP-0310", assetName: "ThinkPad X1 Carbon", action: "REPAIR", actor: "Imran Qureshi", from: "Sneha Pillai", to: null, note: "Keyboard replacement — vendor RMA" },
  { id: "AUD-4818", timestamp: "2026-09-17T10:15:00+05:30", assetTag: "PHN-0092", assetName: "iPhone 15", action: "RETURNED", actor: "Imran Qureshi", from: "Vikram Bose", to: null, note: "Exit clearance" },
  { id: "AUD-4817", timestamp: "2026-09-16T16:22:00+05:30", assetTag: "LAP-0288", assetName: "MacBook Air M2", action: "RETIRED", actor: "Nisha Rawat", from: null, to: null, note: "End of life — 4 years" },
  { id: "AUD-4816", timestamp: "2026-09-16T09:57:00+05:30", assetTag: "NET-0044", assetName: "Cisco Catalyst 9200", action: "CREATED", actor: "Devika Nair", from: null, to: null, note: "Procurement PO-77214" },
  { id: "AUD-4815", timestamp: "2026-09-15T15:39:00+05:30", assetTag: "LAP-0402", assetName: 'MacBook Pro 16"', action: "ASSIGNED", actor: "Nisha Rawat", from: null, to: "Ananya Ghosh", note: "Upgrade request approved" },
  { id: "AUD-4814", timestamp: "2026-09-15T12:11:00+05:30", assetTag: "MON-1092", assetName: "LG UltraFine 27", action: "TRANSFERRED", actor: "Devika Nair", from: "Kabir Anand", to: "Meera Joshi", note: "Desk move — Floor 4" },
  { id: "AUD-4813", timestamp: "2026-09-14T18:05:00+05:30", assetTag: "SRV-0011", assetName: "Dell PowerEdge R650", action: "REPAIR", actor: "Imran Qureshi", from: null, to: null, note: "PSU fault — on-site service" },
  { id: "AUD-4812", timestamp: "2026-09-14T10:26:00+05:30", assetTag: "LAP-0355", assetName: "ThinkPad T14s", action: "RETURNED", actor: "Nisha Rawat", from: "Farhan Ali", to: null, note: "Contract ended" },
  { id: "AUD-4811", timestamp: "2026-09-13T14:50:00+05:30", assetTag: "PER-0620", assetName: "Logitech MX Master 3S", action: "ASSIGNED", actor: "Devika Nair", from: null, to: "Tara Menon", note: "Accessory request" },
  { id: "AUD-4810", timestamp: "2026-09-12T09:18:00+05:30", assetTag: "LAP-0367", assetName: "MacBook Air M3", action: "TRANSFERRED", actor: "Nisha Rawat", from: "Rahul Verma", to: "Priya Nambiar", note: "Manager request" },
];

// ============================================================
// LICENCE RENEWALS
// ============================================================

export const LICENCE_RENEWALS: LicenceRenewal[] = [
  { id: "LIC-201", product: "Adobe Creative Cloud", vendor: "Adobe", seats: 60, seatsUsed: 54, renewalDate: "2026-10-04", annualCost: 2940000 },
  { id: "LIC-202", product: "Microsoft 365 E3", vendor: "Microsoft", seats: 420, seatsUsed: 401, renewalDate: "2026-10-21", annualCost: 7560000 },
  { id: "LIC-203", product: "Atlassian Jira + Confluence", vendor: "Atlassian", seats: 240, seatsUsed: 188, renewalDate: "2026-11-09", annualCost: 1820000 },
  { id: "LIC-204", product: "Figma Organization", vendor: "Figma", seats: 80, seatsUsed: 76, renewalDate: "2026-11-28", annualCost: 1440000 },
  { id: "LIC-205", product: "CrowdStrike Falcon", vendor: "CrowdStrike", seats: 500, seatsUsed: 484, renewalDate: "2026-12-15", annualCost: 4200000 },
  { id: "LIC-206", product: "Zoom Business", vendor: "Zoom", seats: 300, seatsUsed: 212, renewalDate: "2027-01-08", annualCost: 1080000 },
];

// ============================================================
// HELPERS
// ============================================================

export const RANGE_LABELS: Record<ReportRange, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "6m": "Last 6 months",
  "12m": "Last 12 months",
};

export const DEPARTMENT_OPTIONS = [
  "All departments",
  ...DEPARTMENT_ALLOCATION.map((item) => item.department),
];

export function formatCurrency(value: number, compact = false) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
