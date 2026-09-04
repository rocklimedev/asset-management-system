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
import { Employee } from "@/modules/organisation/models/employees.model";

export enum AssignmentStatus {
  ACTIVE = "ACTIVE",
  RETURNED = "RETURNED",
}

@Table({
  tableName: "asset_assignments",
  timestamps: false,
})
export class AssetAssignment extends Model<AssetAssignment> {
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
  // EMPLOYEE
  // ============================================================

  @Index
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "employee_id",
  })
  employeeId!: string;

  @BelongsTo(() => Employee, {
    foreignKey: "employee_id",
  })
  employee!: Employee;

  // ============================================================
  // ASSIGNED AT
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: "assignedAt",
  })
  assignedAt!: Date;

  // ============================================================
  // RETURNED AT
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: "returnedAt",
  })
  returnedAt?: Date | null;

  // ============================================================
  // ASSIGNED BY
  // ============================================================

  @Index
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "assigned_by",
  })
  assignedBy!: string;

  // ============================================================
  // STATUS
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(AssignmentStatus)),
    allowNull: false,
    defaultValue: AssignmentStatus.ACTIVE,
    field: "status",
  })
  status!: AssignmentStatus;

  // ============================================================
  // NOTES
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: "notes",
  })
  notes?: string | null;
}
