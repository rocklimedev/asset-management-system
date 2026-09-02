import { IsInt, IsOptional, IsString } from 'class-validator';

export class TransferAssetDto {
  @IsInt() toEmployeeId!: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() notes?: string;
}
