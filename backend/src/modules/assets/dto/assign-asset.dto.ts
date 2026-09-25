import { IsOptional, IsString, IsUUID } from "class-validator";

export class AssignAssetDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  systemId?: string;

  /** Optional specific physical unit to assign. If omitted, first AVAILABLE unit is used. */
  @IsOptional()
  @IsUUID()
  assetUnitId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
