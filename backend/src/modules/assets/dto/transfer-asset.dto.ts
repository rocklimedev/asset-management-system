import { IsOptional, IsString, IsUUID } from "class-validator";

export class TransferAssetDto {
  @IsUUID("4")
  toEmployeeId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
