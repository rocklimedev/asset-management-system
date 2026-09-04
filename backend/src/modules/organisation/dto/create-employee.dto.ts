import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

import { Employee, EmployeeStatus } from "../models/employees.model";

export class CreateEmployeeDto {
  // ----------------------------------------------------------
  // BASIC INFORMATION
  // ----------------------------------------------------------

  @IsString()
  employeeCode!: string;

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  // ----------------------------------------------------------
  // ORGANISATION STRUCTURE
  // ----------------------------------------------------------

  @IsOptional()
  @IsUUID("4")
  departmentId?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  // Manager is another Employee UUID
  @IsOptional()
  @IsUUID("4")
  managerId?: string;

  // Location UUID
  @IsOptional()
  @IsUUID("4")
  locationId?: string;

  // ----------------------------------------------------------
  // STATUS
  // ----------------------------------------------------------

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  // ----------------------------------------------------------
  // JOINING DATE
  // ----------------------------------------------------------

  @IsOptional()
  @IsDateString()
  joiningDate?: string;
}
