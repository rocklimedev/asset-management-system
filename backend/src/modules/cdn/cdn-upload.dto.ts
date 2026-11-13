import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
export class CdnUploadDto {
  @IsString() @MaxLength(100) @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
  resourceType!: string;

  @IsOptional() @IsString() @MaxLength(100) @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/)
  resourceId?: string;

  @IsIn(['image', 'invoice', 'document'])
  purpose!: 'image' | 'invoice' | 'document';
}
export class CdnDeleteDto {
  @IsString() @MaxLength(1024) @Matches(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*(\/[a-zA-Z0-9][a-zA-Z0-9_.-]*)*$/)
  key!: string;
}
