import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";

export class CreateSystemDto {
  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(100)
  systemTag!: string;

  @Transform(({ value }) => typeof value === "string" ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(255)
  name!: string;

  @IsOptional() @IsString() @MaxLength(5000)
  notes?: string | null;
}
export class UpdateSystemDto extends PartialType(CreateSystemDto) {}
export class AssignSystemDto {
  @IsUUID()
  employeeId!: string;
}
