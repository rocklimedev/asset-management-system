import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { AssetCondition, AssetKind, AssetStatus } from '@prisma/client';

export class CreateAssetDto {
  @IsString() name!: string;
  @IsString() assetTag!: string;
  @IsEnum(AssetKind) kind!: AssetKind;
  @IsInt() categoryId!: number;
  @IsOptional() @IsString() manufacturer?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsString() serialNumber?: string;
  @IsOptional() @IsDateString() purchaseDate?: string;
  @IsOptional() @IsNumber() purchasePrice?: number;
  @IsOptional() @IsInt() vendorId?: number;
  @IsOptional() @IsString() invoiceNumber?: string;
  @IsOptional() @IsDateString() warrantyStart?: string;
  @IsOptional() @IsDateString() warrantyExpiry?: string;
  @IsOptional() @IsEnum(AssetStatus) status?: AssetStatus;
  @IsOptional() @IsEnum(AssetCondition) condition?: AssetCondition;
  @IsOptional() @IsInt() locationId?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsInt() assignEmployeeId?: number; // optional immediate assignment on creation

  // Software-only fields
  @IsOptional() @IsString() licenseVendor?: string;
  @IsOptional() @IsString() licenseType?: string;
  @IsOptional() @IsString() licenseReference?: string;
  @IsOptional() @IsInt() totalSeats?: number;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsDateString() renewalDate?: string;
}
