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

import { Asset } from "./asset.model";
import { Employee } from "@/modules/organisation/models/employees.model";
import { User } from "@/modules/users/models/user.model";

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
  // ASSET
  // ============================================================

  @Index
  @ForeignKey(() => Asset)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "asset_id",
  })
  assetId!: string;

  @BelongsTo(() => Asset, {
    foreignKey: "asset_id",
  })
  asset!: Asset;

  // ============================================================
  // FROM EMPLOYEE
  // ============================================================

  @Index
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "from_employee_id",
  })
  fromEmployeeId?: string | null;

  @BelongsTo(() => Employee, {
    foreignKey: "from_employee_id",
  })
  fromEmployee?: Employee;

  // ============================================================
  // TO EMPLOYEE
  // ============================================================

  @Index
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "to_employee_id",
  })
  toEmployeeId!: string;

  @BelongsTo(() => Employee, {
    foreignKey: "to_employee_id",
  })
  toEmployee!: Employee;

  // ============================================================
  // REQUESTED BY
  // ============================================================

  @Index
  @ForeignKey(() => User)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "requested_by_id",
  })
  requestedById!: string;

  @BelongsTo(() => User, {
    foreignKey: "requested_by_id",
  })
  requestedBy!: User;

  // ============================================================
  // APPROVED BY
  // ============================================================

  @Index
  @ForeignKey(() => User)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "approved_by_id",
  })
  approvedById?: string | null;

  @BelongsTo(() => User, {
    foreignKey: "approved_by_id",
  })
  approvedBy?: User;

  // ============================================================
  // STATUS
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(TransferStatus)),
    allowNull: false,
    defaultValue: TransferStatus.COMPLETED,
    field: "status",
  })
  status!: TransferStatus;

  // ============================================================
  // REASON
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: "reason",
  })
  reason?: string | null;

  // ============================================================
  // NOTES
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: "notes",
  })
  notes?: string | null;

  // ============================================================
  // APPROVED AT
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: "approvedAt",
  })
  approvedAt?: Date | null;
}
