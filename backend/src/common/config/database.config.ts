import { Sequelize } from "sequelize-typescript";

import { Organisation } from "@/modules/organisation/models/organisation.model";
import { Department } from "@/modules/organisation/models/department.model";
import { Location } from "@/modules/organisation/models/location.model";
import { Employee } from "@/modules/organisation/models/employees.model";

import { Permission } from "@/modules/roles/models/permission.model";
import { Role } from "@/modules/roles/models/role.model";
import { RolePermission } from "@/modules/roles/models/role-permission.model";
import { User } from "@/modules/users/models/user.model";

import { AssetCategory } from "@/modules/assets/models/asset-category.model";
import { Vendor } from "@/modules/assets/models/vendor.model";
import { Asset } from "@/modules/assets/models/asset.model";
import { SoftwareLicense } from "@/modules/assets/models/software-license.model";

import { AssetAssignment } from "@/modules/assets/models/asset-assignment.model";
import { AssetTransfer } from "@/modules/assets/models/asset-transfer.model";
import { AssetHistory } from "@/modules/assets/models/asset-history.model";

import { AuditLog } from "@/modules/audit/models/audit-log.model";

export const databaseConfig = new Sequelize({
  dialect: "mysql",

  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),

  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,

  database: process.env.DB_NAME,

  logging: false,

  models: [
    Organisation,
    Department,
    Location,
    Employee,

    Permission,
    Role,
    RolePermission,
    User,

    AssetCategory,
    Vendor,
    Asset,
    SoftwareLicense,

    AssetAssignment,
    AssetTransfer,
    AssetHistory,

    AuditLog,
  ],

  define: {
    timestamps: true,
    underscored: false,
  },

  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});
