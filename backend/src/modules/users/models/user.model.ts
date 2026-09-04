import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index,
  PrimaryKey,
} from "sequelize-typescript";

import { Role } from "@/modules/roles/models/role.model";
import { Employee } from "@/modules/organisation/models/employees.model";
import { AuditLog } from "@/modules/audit/models/audit-log.model";
import { AssetTransfer } from "@/modules/assets/models/asset-transfer.model";

export enum UserStatus {
  ACTIVE = "ACTIVE",
  DISABLED = "DISABLED",
}

@Table({
  tableName: "users",
  timestamps: true,
})
export class User extends Model<User> {
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

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name!: string;

  // ============================================================
  // EMAIL
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  email!: string;

  // ============================================================
  // PASSWORD HASH
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  passwordHash!: string;

  // ============================================================
  // ROLE
  // ============================================================

  @Index
  @ForeignKey(() => Role)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "role_id",
  })
  roleId!: string;

  @BelongsTo(() => Role, {
    foreignKey: "role_id",
  })
  role!: Role;

  // ============================================================
  // STATUS
  // ============================================================

  @Column({
    type: DataType.ENUM(...Object.values(UserStatus)),
    allowNull: false,
    defaultValue: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  // ============================================================
  // EMPLOYEE
  // ============================================================

  @Index
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    unique: true,
    field: "employee_id",
  })
  employeeId?: string | null;

  @BelongsTo(() => Employee, {
    foreignKey: "employee_id",
  })
  employee?: Employee;

  // ============================================================
  // AUDIT LOGS
  // ============================================================

  @HasMany(() => AuditLog, {
    foreignKey: "user_id",
  })
  auditLogs!: AuditLog[];

  // ============================================================
  // ASSET TRANSFER APPROVALS
  // ============================================================

  @HasMany(() => AssetTransfer, {
    foreignKey: "approved_by_id",
  })
  approvals!: AssetTransfer[];

  // ============================================================
  // ASSET TRANSFER REQUESTS
  // ============================================================

  @HasMany(() => AssetTransfer, {
    foreignKey: "requested_by_id",
  })
  requested!: AssetTransfer[];
}
