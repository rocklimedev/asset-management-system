import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  HasOne,
  Index,
} from "sequelize-typescript";

import { Role } from "../../roles/models/role.model";
import { Employee } from "../../organisation/models/employees.model";
import { AuditLog } from "../../audit/models/audit-log.model";
import { AssetTransfer } from "../../assets/models/asset-transfer.model";

export enum UserStatus {
  ACTIVE = "ACTIVE",
  DISABLED = "DISABLED",
}

@Table({
  tableName: "users",
  timestamps: true,
})
export class User extends Model<User> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  passwordHash!: string;

  @ForeignKey(() => Role)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  roleId!: number;

  @BelongsTo(() => Role)
  role!: Role;

  @Column({
    type: DataType.ENUM(...Object.values(UserStatus)),
    allowNull: false,
    defaultValue: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Index
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    unique: true,
  })
  employeeId?: number;

  @BelongsTo(() => Employee)
  employee?: Employee;

  @HasMany(() => AuditLog)
  auditLogs!: AuditLog[];

  @HasMany(() => AssetTransfer, "approvedById")
  approvals!: AssetTransfer[];

  @HasMany(() => AssetTransfer, "requestedById")
  requested!: AssetTransfer[];
}
