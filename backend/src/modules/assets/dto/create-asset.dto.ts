import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";

import { AssetCondition, AssetStatus } from "../models/asset.model";

import { AssetKind } from "../models/asset-category.model";

export class CreateAssetDto {
  // ----------------------------------------------------------
  // BASIC ASSET INFORMATION
  // ----------------------------------------------------------

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  assetTag?: string;

  @IsEnum(AssetKind)
  kind!: AssetKind;

  // ----------------------------------------------------------
  // ORGANISATION / CATEGORY
  // ----------------------------------------------------------

  @IsOptional()
  @IsUUID("4")
  organisationId?: string;

  @IsUUID("4")
  categoryId!: string;

  // ----------------------------------------------------------
  // ASSET DETAILS
  // ----------------------------------------------------------

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  // ----------------------------------------------------------
  // VENDOR
  // ----------------------------------------------------------

  @IsOptional()
  @IsUUID("4")
  vendorId?: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  // ----------------------------------------------------------
  // WARRANTY
  // ----------------------------------------------------------

  @IsOptional()
  @IsDateString()
  warrantyStart?: string;

  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  // ----------------------------------------------------------
  // LOCATION
  // ----------------------------------------------------------

  @IsOptional()
  @IsUUID("4")
  locationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // ----------------------------------------------------------
  // INITIAL ASSIGNMENT
  // ----------------------------------------------------------

  @IsOptional()
  @IsUUID("4")
  assignEmployeeId?: string;

  // ----------------------------------------------------------
  // SOFTWARE LICENSE
  // ----------------------------------------------------------

  @IsOptional()
  @IsString()
  licenseVendor?: string;

  @IsOptional()
  @IsString()
  licenseType?: string;

  @IsOptional()
  @IsString()
  licenseReference?: string;

  @IsOptional()
  @IsNumber()
  totalSeats?: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsDateString()
  renewalDate?: string;
}
