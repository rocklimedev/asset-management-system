import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
  Index,
} from "sequelize-typescript";

import { Asset } from "./asset.model";

@Table({
  tableName: "software_licenses",
  timestamps: false,
})
export class SoftwareLicense extends Model<SoftwareLicense> {
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
    unique: true,
    field: "asset_id",
  })
  assetId!: string;

  @BelongsTo(() => Asset, {
    foreignKey: "asset_id",
  })
  asset!: Asset;

  // ============================================================
  // VENDOR
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  vendor!: string;

  // ============================================================
  // LICENSE TYPE
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  licenseType!: string;

  // ============================================================
  // LICENSE REFERENCE
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  licenseReference!: string;

  // ============================================================
  // TOTAL SEATS
  // ============================================================

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  totalSeats!: number;

  // ============================================================
  // ASSIGNED SEATS
  // ============================================================

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  assignedSeats!: number;

  // ============================================================
  // PURCHASE DATE
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  purchaseDate?: Date | null;

  // ============================================================
  // EXPIRY DATE
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  expiryDate?: Date | null;

  // ============================================================
  // RENEWAL DATE
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  renewalDate?: Date | null;

  // ============================================================
  // COST
  // ============================================================

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
  })
  cost?: number | null;
}
