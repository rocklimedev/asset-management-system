import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from "sequelize-typescript";

import { User } from "../../users/models/user.model";

@Table({
  tableName: "audit_logs",
  timestamps: false,
})
export class AuditLog extends Model<AuditLog> {
  @Index
  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  userId?: number;

  @BelongsTo(() => User)
  user?: User;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  action!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  entity!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  entityId!: string;

  @Column({
    type: DataType.JSON,
    allowNull: true,
  })
  metadata?: Record<string, unknown>;

  @Index
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  createdAt!: Date;
}
