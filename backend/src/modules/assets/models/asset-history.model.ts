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
import { AssetUnit } from "./asset-unit.model";

@Table({
  tableName: "asset_history",
  timestamps: false,
})
export class AssetHistory extends Model<AssetHistory> {
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
  // ASSET UNIT (optional — null for asset-level events)
  // ============================================================

  @Index
  @ForeignKey(() => AssetUnit)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "asset_unit_id",
  })
  assetUnitId?: string | null;

  @BelongsTo(() => AssetUnit, {
    foreignKey: "asset_unit_id",
  })
  assetUnit?: AssetUnit;

  // ============================================================
  // ACTION
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  action!: string;

  // ============================================================
  // PERFORMED BY
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  performedBy!: string;

  // ============================================================
  // FROM / TO VALUE
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  fromValue?: string | null;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  toValue?: string | null;

  // ============================================================
  // NOTES
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes?: string | null;

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
