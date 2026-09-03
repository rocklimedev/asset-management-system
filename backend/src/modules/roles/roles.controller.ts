import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";

import { RequirePermissions } from "../../common/decorator/roles.decorator";
import { AuditService } from "../audit/audit.service";
import {
  CurrentUser,
  AuthUser,
} from "../../common/decorator/current-user.decorator";

import { Role } from "./models/role.model";
import { Permission } from "./models/permission.model";
import { RolePermission } from "./models/role-permission.model";

@Controller("roles")
export class RolesController {
  constructor(
    @InjectModel(Role)
    private readonly roleModel: typeof Role,

    @InjectModel(Permission)
    private readonly permissionModel: typeof Permission,

    @InjectModel(RolePermission)
    private readonly rolePermissionModel: typeof RolePermission,

    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions("role.manage")
  findAll() {
    return this.roleModel.findAll({
      include: [
        {
          model: RolePermission,
          as: "permissions",
          include: [{ model: Permission, as: "permission" }],
        },
      ],
    });
  }

  @Get("permissions")
  @RequirePermissions("role.manage")
  permissions() {
    return this.permissionModel.findAll();
  }

  @Patch(":id/permissions")
  @RequirePermissions("role.manage")
  async setPermissions(
    @Param("id", ParseIntPipe) id: number,
    @Body("permissionIds") permissionIds: number[],
    @CurrentUser() user: AuthUser,
  ) {
    await this.rolePermissionModel.destroy({ where: { roleId: id } });

    await this.rolePermissionModel.bulkCreate(
      permissionIds.map((permissionId) => ({
        roleId: id,
        permissionId,
      })) as RolePermission[],
    );

    await this.audit.log({
      userId: user.id,
      action: "PERMISSION_CHANGED",
      entity: "Role",
      entityId: id,
      metadata: { permissionIds },
    });

    return this.roleModel.findByPk(id, {
      include: [
        {
          model: RolePermission,
          as: "permissions",
          include: [{ model: Permission, as: "permission" }],
        },
      ],
    });
  }
}
