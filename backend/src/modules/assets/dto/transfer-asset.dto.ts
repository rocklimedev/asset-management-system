import { IsOptional, IsString, IsUUID } from "class-validator";

export class TransferAssetDto {
  @IsOptional()
  @IsUUID("4")
  fromSystemId?: string;

  @IsOptional()
  @IsUUID("4")
  toSystemId?: string;

  @IsUUID("4")
  toEmployeeId!: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
