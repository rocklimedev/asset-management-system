import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from "sequelize-typescript";

import { Role } from "./role.model";
import { Permission } from "./permission.model";

@Table({
  tableName: "role_permissions",
  timestamps: false,
})
export class RolePermission extends Model<RolePermission> {
  // ============================================================
  // ROLE
  // ============================================================

  @Index
  @ForeignKey(() => Role)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    primaryKey: true,
    field: "role_id",
  })
  roleId!: string;

  @BelongsTo(() => Role, {
    foreignKey: "role_id",
  })
  role!: Role;

  // ============================================================
  // PERMISSION
  // ============================================================

  @Index
  @ForeignKey(() => Permission)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    primaryKey: true,
    field: "permission_id",
  })
  permissionId!: string;

  @BelongsTo(() => Permission, {
    foreignKey: "permission_id",
  })
  permission!: Permission;
}
