import type { SystemRecord, SystemSpecs } from "../services/api/asset.api";

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
