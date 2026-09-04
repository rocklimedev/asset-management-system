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
import { User } from "@/modules/users/models/user.model";

@Table({
  tableName: "roles",
  timestamps: false,
})
export class Role extends Model<Role> {
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
  // NAME
  // ============================================================

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  name!: string;

  // ============================================================
  // DESCRIPTION
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  description?: string | null;

  // ============================================================
  // ROLE PERMISSIONS
  // ============================================================

  @HasMany(() => RolePermission, {
    foreignKey: "role_id",
  })
  permissions!: RolePermission[];

  // ============================================================
  // USERS
  // ============================================================

  @HasMany(() => User, {
    foreignKey: "role_id",
  })
  users!: User[];
}
