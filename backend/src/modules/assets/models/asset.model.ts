import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasOne,
  HasMany,
  Index,
  PrimaryKey,
} from "sequelize-typescript";

import { Organisation } from "@/modules/organisation/models/organisation.model";
import { AssetCategory } from "./asset-category.model";
import { Vendor } from "./vendor.model";
import { Location } from "@/modules/organisation/models/location.model";

import { SoftwareLicense } from "./software-license.model";
import { AssetAssignment } from "./asset-assignment.model";
import { AssetTransfer } from "./asset-transfer.model";
import { AssetHistory } from "./asset-history.model";

import { AssetKind } from "@/common/enums/assets.enums";

export enum AssetStatus {
  AVAILABLE = "AVAILABLE",
  ASSIGNED = "ASSIGNED",
  REPAIR = "REPAIR",
  LOST = "LOST",
  DAMAGED = "DAMAGED",
  RETIRED = "RETIRED",
  DISPOSED = "DISPOSED",
}

export enum AssetCondition {
  NEW = "NEW",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR",
}

@Table({
  tableName: "assets",
  timestamps: true,
})
export class Asset extends Model<Asset> {
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
  // ASSET TAG
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    unique: true,
  })
  assetTag?: string | null;

  // ============================================================
  // NAME
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name!: string;

  // ============================================================
  // KIND
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(AssetKind)),
    allowNull: false,
  })
  kind!: AssetKind;

  // ============================================================
  // ORGANISATION
  // ============================================================

  @Index
  @ForeignKey(() => Organisation)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "organisation_id",
  })
  organisationId!: string | null;

  @BelongsTo(() => Organisation, {
    foreignKey: "organisation_id",
  })
  organisation!: Organisation;

  // ============================================================
  // CATEGORY
  // ============================================================

  @Index
  @ForeignKey(() => AssetCategory)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "category_id",
  })
  categoryId!: string;

  @BelongsTo(() => AssetCategory, {
    foreignKey: "category_id",
  })
  category!: AssetCategory;

  // ============================================================
  // MANUFACTURER
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  manufacturer?: string | null;

  // ============================================================
  // MODEL
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  model?: string | null;

  // ============================================================
  // SERIAL NUMBER
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    unique: true,
  })
  serialNumber?: string | null;

  // ============================================================
  // PURCHASE DATE
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  purchaseDate?: Date | null;

  // ============================================================
  // PURCHASE PRICE
  // ============================================================

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
  })
  purchasePrice?: number | null;

  // ============================================================
  // VENDOR
  // ============================================================

  @Index
  @ForeignKey(() => Vendor)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "vendor_id",
  })
  vendorId?: string | null;

  @BelongsTo(() => Vendor, {
    foreignKey: "vendor_id",
  })
  vendor?: Vendor;

  // ============================================================
  // INVOICE NUMBER
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  invoiceNumber?: string | null;

  // ============================================================
  // WARRANTY START
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  warrantyStart?: Date | null;

  // ============================================================
  // WARRANTY EXPIRY
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  warrantyExpiry?: Date | null;

  // ============================================================
  // STATUS
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(AssetStatus)),
    allowNull: false,
    defaultValue: AssetStatus.AVAILABLE,
  })
  status!: AssetStatus;

  // ============================================================
  // CONDITION
  // ============================================================

  @Column({
    type: DataType.ENUM(...Object.values(AssetCondition)),
    allowNull: false,
    defaultValue: AssetCondition.GOOD,
  })
  condition!: AssetCondition;

  // ============================================================
  // LOCATION
  // ============================================================

  @Index
  @ForeignKey(() => Location)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "location_id",
  })
  locationId?: string | null;

  @BelongsTo(() => Location, {
    foreignKey: "location_id",
  })
  location?: Location;

  // ============================================================
  // NOTES
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes?: string | null;

  // ============================================================
  // SOFTWARE LICENSE
  // ============================================================

  @HasOne(() => SoftwareLicense)
  license?: SoftwareLicense;

  // ============================================================
  // ASSIGNMENTS
  // ============================================================

  @HasMany(() => AssetAssignment, {
    foreignKey: "asset_id",
  })
  assignments!: AssetAssignment[];

  // ============================================================
  // TRANSFERS
  // ============================================================

  @HasMany(() => AssetTransfer, {
    foreignKey: "asset_id",
  })
  transfers!: AssetTransfer[];

  // ============================================================
  // HISTORY
  // ============================================================

  @HasMany(() => AssetHistory, {
    foreignKey: "asset_id",
  })
  history!: AssetHistory[];
}
