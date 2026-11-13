import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class ProfileDto {
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsString() @Matches(/^[A-Z][A-Z0-9_]{1,79}$/) code!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsArray() @ArrayMaxSize(100) @ArrayUnique() @IsUUID('4', { each: true }) channelIds!: string[];
}
export class UpdateProfileDto extends PartialType(ProfileDto, { skipNullProperties: false }) {}
export class AssignProfileDto {
  @IsOptional() @IsUUID('4') profileId?: string;
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  addChannelIds?: string[];
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  removeChannelIds?: string[];
}
export class ProvisionDto {
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @Matches(/^[a-z0-9.-]+$/) @MaxLength(253) domain?: string;
  // A request-only secret; never copied into workflow data, logs or responses.
  @ValidateIf((_o, value) => value !== undefined)
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  temporaryPassword?: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{8,100}$/) idempotencyKey!: string;
}
export class RetryDto extends ProvisionDto {
  @IsOptional() @IsIn(['MAIL', 'CLIQ', 'CHANNELS', 'ACTIVATION']) step?: string;
}
export class ActivationDto {
  @IsString() @MinLength(10) @MaxLength(500) confirmation!: string;
}
