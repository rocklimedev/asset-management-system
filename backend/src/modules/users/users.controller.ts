import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { IsEmail, IsInt, IsString, MinLength } from "class-validator";
import { UsersService } from "./users.service";
import { RequirePermissions } from "../../common/decorator/roles.decorator";
import {
  CurrentUser,
  AuthUser,
} from "../../common/decorator/current-user.decorator";

class CreateUserDto {
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsInt() roleId!: number;
}

@Controller("users")
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  @RequirePermissions("user.manage")
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @RequirePermissions("user.manage")
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(":id/status")
  @RequirePermissions("user.manage")
  setStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body("status") status: "ACTIVE" | "DISABLED",
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.setStatus(id, status, user);
  }

  @Patch(":id/role")
  @RequirePermissions("user.manage")
  changeRole(
    @Param("id", ParseIntPipe) id: number,
    @Body("roleId") roleId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.changeRole(id, roleId, user);
  }
}
