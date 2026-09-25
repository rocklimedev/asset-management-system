import { Transform } from "class-transformer";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { PartialType } from "@nestjs/mapped-types";

export class CreateSystemDto {
  // ============================================================
  // SYSTEM TAG
  // ============================================================

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  systemTag!: string;

  // ============================================================
  // NAME
  // ============================================================

  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  // ============================================================
  // NOTES
  // ============================================================

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  // ============================================================
  // ORGANISATION
  // ============================================================

  @IsOptional()
  @IsUUID()
  organisationId?: string | null;
}

export class UpdateSystemDto extends PartialType(CreateSystemDto) {}

export class AssignSystemDto {
  // ============================================================
  // EMPLOYEE
  // ============================================================

  @IsUUID()
  employeeId!: string;
}
