import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { RolesController } from "./roles.controller";
import { AuditModule } from "@/modules/audit/audit.module";

import { Role } from "./models/role.model";
import { Permission } from "./models/permission.model";
import { RolePermission } from "./models/role-permission.model";

@Module({
  imports: [
    SequelizeModule.forFeature([Role, Permission, RolePermission]),

    AuditModule,
  ],

  controllers: [RolesController],
})
export class RolesModule {}
