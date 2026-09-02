import { IsInt, IsOptional, IsString } from 'class-validator';

export class AssignAssetDto {
  @IsInt() employeeId!: number;
  @IsOptional() @IsString() notes?: string;
}
