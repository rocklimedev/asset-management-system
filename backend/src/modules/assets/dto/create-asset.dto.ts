import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { AssetCondition, AssetKind, AssetStatus } from "@prisma/client";

export class CreateAssetDto {
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsString()
  @MaxLength(100)
  assetTag?: string;

  @IsEnum(AssetKind)
  kind?: AssetKind;

  @IsInt()
  organisationId?: number;

  @IsInt()
  categoryId?: number;

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

  @IsOptional()
  @IsInt()
  vendorId?: number;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsDateString()
  warrantyStart?: string;

  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @IsOptional()
  @IsInt()
  locationId?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  // ----------------------------------------------------------
  // INITIAL ASSIGNMENT
  // ----------------------------------------------------------

  @IsOptional()
  @IsInt()
  assignEmployeeId?: number;

  // ----------------------------------------------------------
  // SOFTWARE
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
  @IsInt()
  totalSeats?: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsDateString()
  renewalDate?: string;
}
