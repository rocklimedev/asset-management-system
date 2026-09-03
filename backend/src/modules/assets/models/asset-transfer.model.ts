import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from "sequelize-typescript";

import { Asset } from "./asset.model";
import { Employee } from "../../organisation/models/employees.model";
import { User } from "../../users/models/user.model";

export enum TransferStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

@Table({
  tableName: "asset_transfers",
  timestamps: true,
})
export class AssetTransfer extends Model<AssetTransfer> {
  @Index
  @ForeignKey(() => Asset)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  assetId!: number;

  @BelongsTo(() => Asset)
  asset!: Asset;

  @Index
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  fromEmployeeId?: number;

  @BelongsTo(() => Employee, "fromEmployeeId")
  fromEmployee?: Employee;

  @Index
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  toEmployeeId!: number;

  @BelongsTo(() => Employee, "toEmployeeId")
  toEmployee!: Employee;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  requestedById!: number;

  @BelongsTo(() => User, "requestedById")
  requestedBy!: User;

  @ForeignKey(() => User)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  approvedById?: number;

  @BelongsTo(() => User, "approvedById")
  approvedBy?: User;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(TransferStatus)),
    allowNull: false,
    defaultValue: TransferStatus.COMPLETED,
  })
  status!: TransferStatus;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  reason?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  approvedAt?: Date;
}
