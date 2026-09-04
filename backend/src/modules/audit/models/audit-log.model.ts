import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
  PrimaryKey,
} from "sequelize-typescript";

import { User } from "@/modules/users/models/user.model";

@Table({
  tableName: "audit_logs",
  timestamps: false,
})
export class AuditLog extends Model<AuditLog> {
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
  // USER
  // ============================================================

  @Index
  @ForeignKey(() => User)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "user_id",
  })
  userId?: string | null;

  @BelongsTo(() => User, {
    foreignKey: "user_id",
  })
  user?: User;

  // ============================================================
  // ACTION
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  action!: string;

  // ============================================================
  // ENTITY
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  entity!: string;

  // ============================================================
  // ENTITY ID
  // ============================================================

  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  entityId!: string;

  // ============================================================
  // METADATA
  // ============================================================

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  metadata?: Record<string, unknown> | null;

  // ============================================================
  // CREATED AT
  // ============================================================

  @Index
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  createdAt!: Date;
}
