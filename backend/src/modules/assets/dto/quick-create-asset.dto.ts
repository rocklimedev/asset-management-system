import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, Matches } from 'class-validator';
import { AssetKind } from '../models/asset-category.model';

export class QuickCreateAssetDto {
  @IsString()
  @MaxLength(150)
  @Matches(/\S/, { message: 'Asset name is required.' })
  name!: string;

  @IsOptional()
  @IsEnum(AssetKind)
  kind?: AssetKind;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsUUID('4')
  organisationId?: string;

  @IsOptional()
  @IsUUID('4')
  locationId?: string;
}
