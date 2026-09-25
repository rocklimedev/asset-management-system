import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
  PrimaryKey,
  Default,
} from "sequelize-typescript";

import {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";

import { System } from "./system.model";
import { Asset } from "./asset.model";
import { AssetUnit } from "./asset-unit.model";
import { Employee } from "@/modules/organisation/models/employees.model";

export enum AssignmentStatus {
  ACTIVE = "ACTIVE",
  RETURNED = "RETURNED",
}

@Table({
  tableName: "asset_assignments",
  timestamps: false,
})
export class AssetAssignment extends Model<
  InferAttributes<AssetAssignment>,
  InferCreationAttributes<AssetAssignment>
> {
  // ============================================================
  // PRIMARY KEY
  // ============================================================

  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  declare id: CreationOptional<string>;

  // ============================================================
  // ASSET
  //
  // Parent / inventory definition.
  //
  // Kept even when assetUnitId is present because:
  // - existing assignments already use assetId
  // - pooled assets can be assigned without individual units
  // - reporting can continue to group assignments by asset
  // ============================================================

  @Index
  @ForeignKey(() => Asset)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "asset_id",
  })
  declare assetId: string;

  @BelongsTo(() => Asset, {
    foreignKey: "assetId",
    targetKey: "id",
  })
  declare asset?: Asset;

  // ============================================================
  // ASSET UNIT
  //
  // Physical unit being assigned.
  //
  // Example:
  //
  // Asset:
  //   Samsung Galaxy Book 2
  //   quantity = 9
  //
  // AssetUnit:
  //   LAPTOP-001
  //   LAPTOP-002
  //   LAPTOP-003
  //   ...
  //
  // If LAPTOP-003 is assigned to Rahul:
  //
  // assetId     = Samsung Galaxy Book 2
  // assetUnitId = LAPTOP-003
  //
  // Nullable for:
  // - old assignments
  // - pooled/quantity-based inventory
  // ============================================================

  @Index
  @ForeignKey(() => AssetUnit)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "asset_unit_id",
  })
  declare assetUnitId: string | null;

  @BelongsTo(() => AssetUnit, {
    foreignKey: "assetUnitId",
    targetKey: "id",
  })
  declare assetUnit?: AssetUnit;

  // ============================================================
  // EMPLOYEE
  // ============================================================

  @Index
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "employee_id",
  })
  declare employeeId: string | null;

  @BelongsTo(() => Employee, {
    foreignKey: "employeeId",
    targetKey: "id",
  })
  declare employee?: Employee;

  // ============================================================
  // SYSTEM
  //
  // Example:
  // Laptop/component assigned to a workstation/system.
  // ============================================================

  @Index
  @ForeignKey(() => System)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "system_id",
  })
  declare systemId: CreationOptional<string | null>;

  @BelongsTo(() => System, {
    foreignKey: "systemId",
    targetKey: "id",
  })
  declare system?: System;

  // ============================================================
  // ASSIGNED AT
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: "assignedAt",
  })
  declare assignedAt: CreationOptional<Date>;

  // ============================================================
  // RETURNED AT
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: "returnedAt",
  })
  declare returnedAt: Date | null;

  // ============================================================
  // ASSIGNED BY
  // ============================================================

  @Index
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "assigned_by",
  })
  declare assignedBy: string;

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
  declare status: CreationOptional<AssignmentStatus>;

  // ============================================================
  // NOTES
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: "notes",
  })
  declare notes: string | null;
}
