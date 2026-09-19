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
  RESTOCK = "RESTOCK", // new stock received
  CONSUMED = "CONSUMED", // checked out against quantityAssigned
  RETURNED = "RETURNED", // checked back in
  ADJUSTMENT = "ADJUSTMENT", // manual correction (stock count, etc.)
  WRITE_OFF = "WRITE_OFF", // lost / damaged / disposed units removed from stock
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
    foreignKey: "asset_id",
  })
  asset!: Asset;

  // ============================================================
  // CHANGE TYPE
  // ============================================================

  @Column({
    type: DataType.ENUM(...Object.values(InventoryChangeType)),
    allowNull: false,
  })
  changeType!: InventoryChangeType;

  // ============================================================
  // QUANTITY DELTA (signed: +10 restock, -1 consumed, etc.)
  // ============================================================

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  quantityDelta!: number;

  // ============================================================
  // SNAPSHOT AFTER CHANGE (for audit-friendly reads without replay)
  // ============================================================

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    field: "quantity_after",
  })
  quantityAfter!: number;

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
