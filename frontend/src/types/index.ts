export type AssetKind = 'HARDWARE' | 'SOFTWARE';
export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'REPAIR' | 'LOST' | 'DAMAGED' | 'RETIRED' | 'DISPOSED';
export type AssetCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
export type EmployeeStatus = 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE' | 'EXITED';

export interface Department { id: number; name: string }
export interface Location { id: number; name: string }
export interface AssetCategory { id: number; name: string; type: AssetKind }

export interface Employee {
  id: number;
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
  id: number;
  assetId: number;
  employeeId: number;
  assignedAt: string;
  status: 'ACTIVE' | 'RETURNED';
  employee?: Employee;
  asset?: Asset;
}

export interface SoftwareLicense {
  id: number;
  vendor: string;
  licenseType: string;
  licenseReference: string;
  totalSeats: number;
  assignedSeats: number;
  expiryDate?: string | null;
  renewalDate?: string | null;
}

export interface Asset {
  id: number;
  assetTag: string;
  name: string;
  kind: AssetKind;
  category?: AssetCategory;
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
  assignments?: AssetAssignment[]; // active assignment (0 or 1 item) when included
  notes?: string | null;
}

export interface AssetHistoryEntry {
  id: number;
  action: string;
  performedBy: string;
  fromValue?: string | null;
  toValue?: string | null;
  notes?: string | null;
  createdAt: string;
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
    id: number;
    action: string;
    assetName: string;
    fromValue?: string | null;
    toValue?: string | null;
    performedBy: string;
    createdAt: string;
  }[];
  upcoming: {
    licenseExpirations: { assetName: string; expiryDate: string; urgency: 'red' | 'yellow' }[];
    warrantyExpirations: { assetName: string; assetTag: string; warrantyExpiry: string; urgency: 'red' | 'yellow' }[];
  };
}

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: string;
  permissions: string[];
}
