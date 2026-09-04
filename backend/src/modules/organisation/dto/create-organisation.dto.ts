import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateOrganisationDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
