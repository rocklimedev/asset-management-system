import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CellularIdentityDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{15}$/, { message: "IMEI must contain exactly 15 digits." })
  imei?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  simNumber?: string;
}
