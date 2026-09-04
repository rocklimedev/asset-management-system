import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";

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

import { RequirePermissions } from "@/common/decorator/roles.decorator";
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

  @IsUUID("4")
  roleId!: string;

  @IsOptional()
  @IsUUID("4")
  employeeId?: string;
}

class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}

class ChangeUserRoleDto {
  @IsUUID("4")
  roleId!: string;
}

@Controller("users")
export class UsersController {
  constructor(private readonly service: UsersService) {}

  // ============================================================
  // GET ALL USERS
  // ============================================================

  @Get()
  @RequirePermissions("user.manage")
  findAll() {
    return this.service.findAll();
  }

  // ============================================================
  // CREATE USER
  // ============================================================

  @Post()
  @RequirePermissions("user.manage")
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  // ============================================================
  // UPDATE USER STATUS
  // ============================================================

  @Patch(":id/status")
  @RequirePermissions("user.manage")
  setStatus(
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.setStatus(id, dto.status, user);
  }

  // ============================================================
  // CHANGE USER ROLE
  // ============================================================

  @Patch(":id/role")
  @RequirePermissions("user.manage")
  changeRole(
    @Param("id") id: string,
    @Body() dto: ChangeUserRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.changeRole(id, dto.roleId, user);
  }
}
