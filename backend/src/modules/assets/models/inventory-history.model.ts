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

export enum InventoryChangeType {
  // ============================================================
  // PHYSICAL INVENTORY MOVEMENTS
  // ============================================================

  RESTOCK = "RESTOCK", // new stock received / added to inventory

  CONSUMED = "CONSUMED", // physical stock consumed / removed

  WRITE_OFF = "WRITE_OFF", // lost, damaged, disposed, or permanently removed stock

  ADJUSTMENT = "ADJUSTMENT", // manual physical stock correction

  // ============================================================
  // CUSTODY / ASSIGNMENT EVENTS
  // ============================================================

  ASSIGNED = "ASSIGNED", // asset assigned to an employee/system; physical quantity unchanged

  RETURNED = "RETURNED", // asset returned from employee/system; physical quantity unchanged
}

@Table({
  tableName: "inventory_history",
  timestamps: false,
})
export class InventoryHistory extends Model<InventoryHistory> {
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
    foreignKey: "assetId",
    targetKey: "id",
  })
  asset!: Asset;

  // ============================================================
  // CHANGE TYPE
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(InventoryChangeType)),
    allowNull: false,
  })
  changeType!: InventoryChangeType;

  // ============================================================
  // QUANTITY DELTA
  //
  // Physical inventory change only.
  //
  // RESTOCK:
  //   +5
  //
  // CONSUMED:
  //   -1
  //
  // WRITE_OFF:
  //   -1
  //
  // ADJUSTMENT:
  //   +5 / -2
  //
  // ASSIGNED / RETURNED:
  //   0
  //
  // Assignment changes quantityAssigned, not physical quantity.
  // ============================================================

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  quantityDelta!: number;

  // ============================================================
  // PHYSICAL QUANTITY AFTER CHANGE
  //
  // Example:
  //
  // RESTOCK +5
  // quantityAfter = 6
  //
  // ASSIGNED
  // quantityAfter = 6
  //
  // RETURNED
  // quantityAfter = 6
  //
  // Assignment/return does NOT change physical quantity.
  // ============================================================

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: "quantity_after",
  })
  quantityAfter!: number;

  // ============================================================
  // ASSIGNED QUANTITY AFTER CHANGE
  //
  // Example for individually tracked asset:
  //
  // ASSIGNED
  // quantityAssignedAfter = 1
  //
  // RETURNED
  // quantityAssignedAfter = 0
  //
  // RESTOCK
  // quantityAssignedAfter remains whatever the current
  // assignment state is.
  // ============================================================

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: "quantity_assigned_after",
  })
  quantityAssignedAfter!: number;

  // ============================================================
  // PERFORMED BY
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  performedBy!: string;

  // ============================================================
  // REASON / NOTES
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  reason?: string | null;

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
