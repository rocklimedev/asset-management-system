import { IsOptional, IsString, IsUUID } from "class-validator";

export class AssignAssetDto {
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @IsOptional()
  @IsUUID()
  systemId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
