import { IsOptional, IsString, IsUUID } from "class-validator";

export class AssignAssetDto {
  @IsUUID()
  employeeId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
