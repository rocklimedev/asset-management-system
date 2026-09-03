import { IsEmail, IsInt, IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { EmployeeStatus } from '@prisma/client';

export class CreateEmployeeDto {
  @IsString() employeeCode!: string;
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() avatarUrl?: string;
  @IsOptional() @IsInt() departmentId?: number;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsInt() managerId?: number;
  @IsOptional() @IsInt() locationId?: number;
  @IsOptional() @IsEnum(EmployeeStatus) status?: EmployeeStatus;
  @IsOptional() @IsDateString() joiningDate?: string;
}
