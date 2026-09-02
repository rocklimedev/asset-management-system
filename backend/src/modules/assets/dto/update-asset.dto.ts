import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateAssetDto } from './create-asset.dto';

// Ownership is never edited here directly — see AssignAssetDto / TransferAssetDto.
export class UpdateAssetDto extends PartialType(
  OmitType(CreateAssetDto, ['assignEmployeeId'] as const),
) {}
