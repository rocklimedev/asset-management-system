import { Sequelize } from "sequelize-typescript";

import { Organisation } from "../modules/assets/models/organisation.model";
import { Department } from "../modules/assets/models/department.model";
import { Location } from "../modules/assets/models/location.model";
import { Employee } from "../modules/assets/models/employee.model";

import { Permission } from "../modules/assets/models/permission.model";
import { Role } from "../modules/assets/models/role.model";
import { RolePermission } from "../modules/assets/models/role-permission.model";
import { User } from "../modules/assets/models/user.model";

import { AssetCategory } from "../modules/assets/models/asset-category.model";
import { Vendor } from "../modules/assets/models/vendor.model";
import { Asset } from "../modules/assets/models/asset.model";
import { SoftwareLicense } from "../modules/assets/models/software-license.model";

import { AssetAssignment } from "../modules/assets/models/asset-assignment.model";
import { AssetTransfer } from "../modules/assets/models/asset-transfer.model";
import { AssetHistory } from "../modules/assets/models/asset-history.model";

import { AuditLog } from "../modules/assets/models/audit-log.model";
import { Setting } from "../modules/assets/models/setting.model";

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
    Setting,
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
