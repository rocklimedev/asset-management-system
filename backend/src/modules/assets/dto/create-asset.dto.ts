import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

import { AssetCondition, AssetStatus } from "../models/asset.model";

import { AssetKind } from "../models/asset-category.model";
import { AssetTrackingMode } from "../models/asset.model";

/**
 * Data used when creating individual physical units together
 * with the parent Asset.
 *
 * Example:
 *
 * quantity = 3
 *
 * initialUnits = [
 *   { unitCode: "LAP-001", serialNumber: "SN001" },
 *   { unitCode: "LAP-002", serialNumber: "SN002" },
 *   { unitCode: "LAP-003", serialNumber: "SN003" }
 * ]
 */
export class CreateAssetUnitInputDto {
  // ----------------------------------------------------------
  // UNIT CODE
  // ----------------------------------------------------------

  @IsOptional()
  @IsString()
  @MaxLength(255)
  unitCode?: string;

  // ----------------------------------------------------------
  // SERIAL NUMBER
  // ----------------------------------------------------------

  @IsOptional()
  @IsString()
  @MaxLength(255)
  serialNumber?: string;
  // ----------------------------------------------------------
  // UNIT STATUS
  // ----------------------------------------------------------

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  // ----------------------------------------------------------
  // UNIT CONDITION
  // ----------------------------------------------------------

  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  // ----------------------------------------------------------
  // UNIT LOCATION
  // ----------------------------------------------------------

  @IsOptional()
  @IsUUID("4")
  locationId?: string;

  // ----------------------------------------------------------
  // NOTES
  // ----------------------------------------------------------

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAssetDto {
  // ==========================================================
  // BASIC ASSET INFORMATION
  // ==========================================================

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  assetTag?: string;

  @IsEnum(AssetKind)
  kind!: AssetKind;

  // ==========================================================
  // TRACKING MODE
  //
  // INDIVIDUAL
  //   Example: laptops, phones, tablets, cameras
  //
  // QUANTITY
  //   Example: cables, mice, keyboards, consumables
  // ==========================================================

  @IsOptional()
  @IsEnum(AssetTrackingMode)
  trackingMode?: AssetTrackingMode;

  // ==========================================================
  // QUANTITY
  // ==========================================================

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  // ==========================================================
  // ORGANISATION / CATEGORY
  // ==========================================================

  @IsOptional()
  @IsUUID("4")
  organisationId?: string;

  @IsUUID("4")
  categoryId!: string;

  // ==========================================================
  // COMMON ASSET DETAILS
  //
  // These fields apply to the asset/product as a whole.
  // Unit-specific serial numbers should go into initialUnits.
  // ==========================================================

  @IsOptional()
  @IsString()
  @MaxLength(255)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  serialNumber?: string;
  // ==========================================================
  // PURCHASE INFORMATION
  // ==========================================================

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  // ==========================================================
  // VENDOR
  // ==========================================================

  @IsOptional()
  @IsUUID("4")
  vendorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  invoiceNumber?: string;

  // ==========================================================
  // WARRANTY
  // ==========================================================

  @IsOptional()
  @IsDateString()
  warrantyStart?: string;

  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  // ==========================================================
  // LEGACY / AGGREGATE STATUS
  //
  // These are retained for backwards compatibility.
  //
  // For INDIVIDUAL assets, the actual state is stored on
  // AssetUnit.
  // ==========================================================

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  // ==========================================================
  // DEFAULT LOCATION
  //
  // Used as the default location when creating units.
  //
  // For INDIVIDUAL assets, the authoritative location becomes
  // AssetUnit.locationId.
  // ==========================================================

  @IsOptional()
  @IsUUID("4")
  locationId?: string;

  // ==========================================================
  // NOTES
  // ==========================================================

  @IsOptional()
  @IsString()
  notes?: string;

  // ==========================================================
  // INITIAL PHYSICAL UNITS
  //
  // Only meaningful when trackingMode = INDIVIDUAL.
  //
  // Example:
  //
  // quantity: 3
  //
  // initialUnits: [
  //   {
  //     unitCode: "LAP-001",
  //     serialNumber: "ABC001"
  //   },
  //   {
  //     unitCode: "LAP-002",
  //     serialNumber: "ABC002"
  //   },
  //   {
  //     unitCode: "LAP-003",
  //     serialNumber: "ABC003"
  //   }
  // ]
  // ==========================================================

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAssetUnitInputDto)
  initialUnits?: CreateAssetUnitInputDto[];

  // ==========================================================
  // INITIAL ASSIGNMENT
  //
  // Kept for backwards compatibility.
  //
  // For an INDIVIDUAL asset, the service should assign one
  // AVAILABLE AssetUnit.
  // ==========================================================

  @IsOptional()
  @IsUUID("4")
  assignEmployeeId?: string;

  // ==========================================================
  // SOFTWARE LICENSE
  // ==========================================================

  @IsOptional()
  @IsString()
  @MaxLength(255)
  licenseVendor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  licenseType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  licenseReference?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  totalSeats?: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsDateString()
  renewalDate?: string;
}
