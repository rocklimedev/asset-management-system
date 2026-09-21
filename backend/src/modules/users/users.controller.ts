import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from "class-validator";

import { UsersService } from "./users.service";
import { UserStatus } from "./models/user.model";

import {
  CurrentUser,
  AuthUser,
} from "@/common/decorator/current-user.decorator";

class CreateUserDto {
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string | null;
}

class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}

class ChangeUserRoleDto {
  @IsUUID()
  roleId!: string;
}

@Controller("users")
export class UsersController {
  constructor(private readonly service: UsersService) {}

  // ============================================================
  // GET ALL USERS
  // ============================================================

  @Get()
  findAll() {
    return this.service.findAll();
  }

  // ============================================================
  // CREATE USER
  // ============================================================

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  // ============================================================
  // UPDATE USER
  // ============================================================

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  // ============================================================
  // DELETE USER
  // ============================================================

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }

  // ============================================================
  // UPDATE USER STATUS
  // ============================================================

  @Patch(":id/status")
  setStatus(
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.setStatus(id, dto.status, user);
  }

  // ============================================================
  // UPDATE USER ROLE
  // ============================================================

  @Patch(":id/role")
  changeRole(
    @Param("id") id: string,
    @Body() dto: ChangeUserRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.changeRole(id, dto.roleId, user);
  }
}
