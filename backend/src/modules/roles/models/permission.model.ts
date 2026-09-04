import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  PrimaryKey,
  Index,
} from "sequelize-typescript";

import { RolePermission } from "./role-permission.model";

@Table({
  tableName: "permissions",
  timestamps: false,
})
export class Permission extends Model<Permission> {
  // ============================================================
  // ID
  // ============================================================

  @PrimaryKey
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  // ============================================================
  // KEY
  // ============================================================

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  key!: string;

  // ============================================================
  // DESCRIPTION
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  description!: string;

  // ============================================================
  // ROLE PERMISSIONS
  // ============================================================

  @HasMany(() => RolePermission, {
    foreignKey: "permission_id",
  })
  roles!: RolePermission[];
}
