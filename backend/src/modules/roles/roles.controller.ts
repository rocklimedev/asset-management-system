import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";

import { RequirePermissions } from "@/common/decorator/roles.decorator";
import { AuditService } from "@/modules/audit/audit.service";

import {
  CurrentUser,
  AuthUser,
} from "@/common/decorator/current-user.decorator";

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

  // ============================================================
  // GET ALL ROLES
  // ============================================================

  @Get()
  findAll() {
    return this.roleModel.findAll({
      include: [
        {
          model: RolePermission,
          as: "permissions",
          include: [
            {
              model: Permission,
              as: "permission",
            },
          ],
        },
      ],
      order: [["name", "ASC"]],
    });
  }

  // ============================================================
  // GET ALL PERMISSIONS
  // ============================================================

  @Get("permissions")
  permissions() {
    return this.permissionModel.findAll({
      order: [["name", "ASC"]],
    });
  }

  // ============================================================
  // SET ROLE PERMISSIONS
  // ============================================================

  @Patch(":id/permissions")
  async setPermissions(
    @Param("id") id: string,

    @Body("permissionIds") permissionIds: string[],

    @CurrentUser() user: AuthUser,
  ) {
    // Validate payload
    if (!Array.isArray(permissionIds)) {
      throw new Error("permissionIds must be an array.");
    }

    // Make sure the role exists
    const role = await this.roleModel.findByPk(id);

    if (!role) {
      throw new Error("Role not found.");
    }

    // Remove existing permissions
    await this.rolePermissionModel.destroy({
      where: {
        roleId: id,
      },
    });

    // Add new permissions
    if (permissionIds.length > 0) {
      await this.rolePermissionModel.bulkCreate(
        permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })) as RolePermission[],
      );
    }

    // Audit
    await this.audit.log({
      userId: user.id,

      action: "PERMISSION_CHANGED",

      entity: "Role",

      entityId: id,

      metadata: {
        permissionIds,
      },
    });

    // Return updated role
    return this.roleModel.findByPk(id, {
      include: [
        {
          model: RolePermission,
          as: "permissions",
          include: [
            {
              model: Permission,
              as: "permission",
            },
          ],
        },
      ],
    });
  }
}
