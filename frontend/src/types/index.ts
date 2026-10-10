import type { AssetUnit } from "../services/api/asset.api";
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
export type EmployeeStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE" | "EXITED";
export type AssignmentStatus = "ACTIVE" | "RETURNED";

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Department {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface AssetCategory {
  id: string;
  name: string;
  type: AssetKind;
  description?: string | null;
  isActive?: boolean;
  organisationId?: string | null;
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  designation?: string | null;
  status: EmployeeStatus;
  department?: Department | null;
  location?: Location | null;
  assignments?: AssetAssignment[];
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  employeeId: string;
  systemId?: string | null;
  assetUnitId?: string | null;
  assetUnit?: AssetUnit | null;
  assignedAt: string;
  returnedAt?: string | null;
  status: AssignmentStatus;
  notes?: string | null;
  employee?: Employee | null;
  system?: SystemRecord | null;
  asset?: Asset;
}

export interface SoftwareLicense {
  id: string;
  vendor: string;
  licenseType: string;
  licenseReference: string;
  totalSeats: number;
  assignedSeats: number;
  expiryDate?: string | null;
  renewalDate?: string | null;
}

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  categoryId?: string;
  organisationId?: string | null;
  locationId?: string | null;
  vendorId?: string | null;
  invoiceNumber?: string | null;
  warrantyStart?: string | null;
  trackingMode?: AssetTrackingMode;
  units?: AssetUnit[];
  history?: AssetHistoryEntry[];
  kind: AssetKind;
  category?: AssetCategory | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchasePrice?: string | number | null;
  warrantyExpiry?: string | null;
  status: AssetStatus;
  condition: AssetCondition;
  location?: Location | null;
  license?: SoftwareLicense | null;
  assignments?: AssetAssignment[];
  notes?: string | null;
  imageUrl?: string | null;

  // Inventory (quantity-tracked assets)
  quantity?: number;
  quantityAssigned?: number;
  reorderLevel?: number | null;
}

export interface AssetHistoryEntry {
  id: string;
  action: string;
  assetId: string;
  assetUnitId?: string | null;
  assetUnit?: AssetUnit | null;
  performedBy: string;
  fromValue?: string | null;
  toValue?: string | null;
  notes?: string | null;
  createdAt: string;
}

export type AssetHistory = AssetHistoryEntry;

export interface SystemRecord {
  id: string;
  systemTag: string;
  name: string;
  employeeId: string | null;
  notes?: string | null;
  specs?: SystemSpecs | null;
  employee?: Employee | null;
  assignments?: AssetAssignment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemInput {
  systemTag: string;
  name?: string | null;
  employeeId?: string | null;
  notes?: string | null;
  organisationId?: string | null;
}

export interface SystemSpecs {
  systemId: string;
  processor?: string | null;
  ram?: string | null;
  localStorage?: string | null;
  graphicsCard?: string | null;
  motherboard?: string | null;
  powerSupply?: string | null;
  monitor?: string | null;
  monitorSize?: string | null;
  operatingSystem?: string | null;
  osVersion?: string | null;
  cloudStorage?: string | null;
  cloudStorageEmail?: string | null;
  macAddress?: string | null;
  ipAddress?: string | null;
  notes?: string | null;
  updatedAt?: string;
}

export interface SoftwareAsset {
  id: string;
  name: string;
  publisher?: string | null;
  version?: string | null;
  asset?: Asset | null;
  system?: SystemRecord | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardSummary {
  cards: {
    totalAssets: number;
    assignedAssets: number;
    unassignedAssets: number;
    employees: number;
    hardware: number;
    software: number;
    underRepair: number;
    expiringLicenses: number;
  };
  assetDistribution: { status: AssetStatus; count: number }[];
  hardwareBreakdown: { category: string; count: number }[];
  softwareBreakdown: { category: string; count: number }[];
  recentActivity: {
    id: string;
    action: string;
    assetName: string;
    fromValue?: string | null;
    toValue?: string | null;
    performedBy: string;
    createdAt: string;
  }[];
  upcoming: {
    licenseExpirations: {
      assetName: string;
      expiryDate: string;
      urgency: "red" | "yellow";
    }[];
    warrantyExpirations: {
      assetName: string;
      assetTag: string;
      warrantyExpiry: string;
      urgency: "red" | "yellow";
    }[];
  };
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}

// ============================================================
// ORGANISATION
// ============================================================

export type OrganisationInfo = {
  id: string;
  name?: string | null;
};

export type SystemWithOrganisation = SystemRecord & {
  organisationId?: string | null;
  organisation?: OrganisationInfo | null;
};

// ============================================================
// SPECS FORM
// ============================================================

export type SpecsForm = {
  processor: string;
  ram: string;
  localStorage: string;
  graphicsCard: string;
  motherboard: string;
  powerSupply: string;
  monitor: string;
  monitorSize: string;
  operatingSystem: string;
  osVersion: string;
  cloudStorage: string;
  cloudStorageEmail: string;
  cloudStoragePassword: string;
  macAddress: string;
  ipAddress: string;
  notes: string;
};

export const emptySpecs: SpecsForm = {
  processor: "",
  ram: "",
  localStorage: "",
  graphicsCard: "",
  motherboard: "",
  powerSupply: "",
  monitor: "",
  monitorSize: "",
  operatingSystem: "",
  osVersion: "",
  cloudStorage: "",
  cloudStorageEmail: "",
  cloudStoragePassword: "",
  macAddress: "",
  ipAddress: "",
  notes: "",
};

export function specsToForm(specs?: SystemSpecs | null): SpecsForm {
  if (!specs) return { ...emptySpecs };

  return {
    processor: specs.processor ?? "",
    ram: specs.ram ?? "",
    localStorage: specs.localStorage ?? "",
    graphicsCard: specs.graphicsCard ?? "",
    motherboard: specs.motherboard ?? "",
    powerSupply: specs.powerSupply ?? "",
    monitor: specs.monitor ?? "",
    monitorSize: specs.monitorSize ?? "",
    operatingSystem: specs.operatingSystem ?? "",
    osVersion: specs.osVersion ?? "",
    cloudStorage: specs.cloudStorage ?? "",
    cloudStorageEmail: specs.cloudStorageEmail ?? "",
    cloudStoragePassword: "",
    macAddress: specs.macAddress ?? "",
    ipAddress: specs.ipAddress ?? "",
    notes: specs.notes ?? "",
  };
}

// ============================================================
// ERROR HELPER
// ============================================================

export function apiErrorMessage(error: unknown) {
  const value = (error as { data?: { message?: string | string[] } })?.data
    ?.message;

  return Array.isArray(value)
    ? value.join(". ")
    : (value ?? "Please try again.");
}
