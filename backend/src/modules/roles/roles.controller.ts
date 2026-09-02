import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RequirePermissions } from "../auth/roles.decorator";
import { AuditService } from "../audit/audit.service";
import { CurrentUser, AuthUser } from "../auth/current-user.decorator";

@Controller("roles")
export class RolesController {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions("role.manage")
  findAll() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
    });
  }

  @Get("permissions")
  @RequirePermissions("role.manage")
  permissions() {
    return this.prisma.permission.findMany();
  }

  @Patch(":id/permissions")
  @RequirePermissions("role.manage")
  async setPermissions(
    @Param("id", ParseIntPipe) id: number,
    @Body("permissionIds") permissionIds: number[],
    @CurrentUser() user: AuthUser,
  ) {
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
    });
    await this.audit.log({
      userId: user.id,
      action: "PERMISSION_CHANGED",
      entity: "Role",
      entityId: id,
      metadata: { permissionIds },
    });
    return this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
  }
}
