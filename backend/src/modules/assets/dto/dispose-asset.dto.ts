import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
export class DisposeAssetDto {
  @IsIn(['DISCARD', 'GIVE_AWAY']) action!: 'DISCARD' | 'GIVE_AWAY';
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() @MaxLength(255) recipient?: string;
  @IsString() @MaxLength(5000) reason!: string;
}
