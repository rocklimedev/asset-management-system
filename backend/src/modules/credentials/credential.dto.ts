import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateCredentialDto {
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(255) title!: string;
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(100) category!: string;
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(4000) purpose!: string;
  @IsString() @IsNotEmpty() @Matches(/\S/) @MaxLength(255) systemLabel!: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) username!: string;
  @IsString() @IsNotEmpty() @MaxLength(4000) password!: string;
}
export class UpdateCredentialDto extends PartialType(CreateCredentialDto, { skipNullProperties: false }) {}
