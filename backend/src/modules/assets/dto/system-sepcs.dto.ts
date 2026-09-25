import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class UpsertSystemSpecsDto {
  // ============================================================
  // HARDWARE
  // ============================================================

  @IsOptional()
  @IsString()
  @MaxLength(255)
  processor?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ram?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  localStorage?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  graphicsCard?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motherboard?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  powerSupply?: string | null;

  // ============================================================
  // DISPLAY
  // ============================================================

  @IsOptional()
  @IsString()
  @MaxLength(255)
  monitor?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  monitorSize?: string | null;

  // ============================================================
  // SOFTWARE
  // ============================================================

  @IsOptional()
  @IsString()
  @MaxLength(255)
  operatingSystem?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  osVersion?: string | null;

  // ============================================================
  // CLOUD STORAGE
  // ============================================================

  @IsOptional()
  @IsString()
  @MaxLength(255)
  cloudStorage?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  cloudStorageEmail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  cloudStoragePassword?: string | null;

  // ============================================================
  // NETWORK
  // ============================================================

  @IsOptional()
  @IsString()
  @MaxLength(100)
  macAddress?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ipAddress?: string | null;

  // ============================================================
  // OTHER
  // ============================================================

  @IsOptional()
  @IsString()
  notes?: string | null;
}
