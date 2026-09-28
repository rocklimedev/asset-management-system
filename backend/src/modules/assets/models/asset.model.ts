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
import { Location } from "@/modules/organisation/models/location.model";
import { SoftwareDetails } from "./software-details.model";
import { AssetKind } from "@/common/enums/assets.enums";

import { AssetCategory } from "./asset-category.model";
import { Vendor } from "./vendor.model";
import { SoftwareLicense } from "./software-license.model";
import { SoftwareLicenseAssignment } from "./software-license-assignment.model";
import { AssetAssignment } from "./asset-assignment.model";
import { AssetTransfer } from "./asset-transfer.model";
import { AssetHistory } from "./asset-history.model";
import { InventoryHistory } from "./inventory-history.model";
import { AssetUnit } from "./asset-unit.model";

export enum AssetStatus {
  AVAILABLE = "AVAILABLE",
  ASSIGNED = "ASSIGNED",
  REPAIR = "REPAIR",
  LOST = "LOST",
  DAMAGED = "DAMAGED",
  RETIRED = "RETIRED",
  DISPOSED = "DISPOSED",
}

export enum AssetTrackingMode {
  INDIVIDUAL = "INDIVIDUAL",
  QUANTITY = "QUANTITY",
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
    foreignKey: "organisationId",
  })
  organisation?: Organisation;

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
    foreignKey: "categoryId",
  })
  category?: AssetCategory;

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
  //
  // Kept for backward compatibility during migration.
  // For individually tracked assets, serialNumber should
  // eventually live on AssetUnit.
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    unique: true,
  })
  serialNumber?: string | null;

  // ============================================================
  // PURCHASE DATE / PRICE
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  purchaseDate?: Date | null;

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
    foreignKey: "vendorId",
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
  // WARRANTY START / EXPIRY
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  warrantyStart?: Date | null;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  warrantyExpiry?: Date | null;

  // ============================================================
  // STATUS
  //
  // Legacy / aggregate status. For assets with AssetUnit records,
  // individual unit status should be read from AssetUnit.
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
  //
  // Legacy / aggregate condition. Once AssetUnit is enabled,
  // individual conditions should live on AssetUnit.
  // ============================================================

  @Column({
    type: DataType.ENUM(...Object.values(AssetCondition)),
    allowNull: false,
    defaultValue: AssetCondition.GOOD,
  })
  condition!: AssetCondition;

  // ============================================================
  // LOCATION
  //
  // Legacy / aggregate location. Individual units can have their
  // own location through AssetUnit.
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
    foreignKey: "locationId",
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
  // INVENTORY / QUANTITY
  //
  // Asset represents the inventory/product definition.
  // Example: Samsung Galaxy Book 2, quantity = 9.
  // Individual physical state is represented by AssetUnit.
  // ============================================================

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  quantity!: number;

  // ============================================================
  // ASSIGNED QUANTITY
  //
  // For pooled inventory: number of units currently checked out.
  // For individually tracked assets this should eventually be
  // derived from AssetUnit.status = ASSIGNED.
  // ============================================================

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  quantityAssigned!: number;

  // ============================================================
  // REORDER LEVEL
  // ============================================================

  @Column({
    type: DataType.INTEGER,
    allowNull: true,
    field: "reorder_level",
  })
  reorderLevel?: number | null;

  // ============================================================
  // IMAGE
  // ============================================================

  @Column({
    type: DataType.STRING(500),
    allowNull: true,
    field: "image_key",
  })
  imageKey?: string | null;

  @Column({
    type: DataType.STRING(1000),
    allowNull: true,
    field: "image_url",
  })
  imageUrl?: string | null;

  // ============================================================
  // TRACKING MODE
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(AssetTrackingMode)),
    allowNull: false,
    defaultValue: AssetTrackingMode.QUANTITY,
    field: "tracking_mode",
  })
  trackingMode!: AssetTrackingMode;

  // ============================================================
  // ASSET UNITS
  //
  // One Asset can have many physical units, each with its own
  // status / condition / location.
  // ============================================================

  @HasMany(() => AssetUnit, {
    foreignKey: "assetId",
  })
  units?: AssetUnit[];

  // ============================================================
  // ASSIGNMENTS
  // ============================================================

  @HasMany(() => AssetAssignment, {
    foreignKey: "assetId",
  })
  assignments?: AssetAssignment[];

  // ============================================================
  // TRANSFERS
  // ============================================================

  @HasMany(() => AssetTransfer, {
    foreignKey: "asset_id",
  })
  transfers?: AssetTransfer[];

  // ============================================================
  // SOFTWARE (only for kind = SOFTWARE)
  //
  // software       -> catalog details (version, publisher, parent...)
  // licenses       -> license records / seat pools
  // installations  -> where this software is installed (system level)
  // ============================================================

  @HasOne(() => SoftwareDetails, {
    foreignKey: "assetId",
  })
  software?: SoftwareDetails;

  @HasMany(() => SoftwareLicense, {
    foreignKey: "assetId",
  })
  licenses?: SoftwareLicense[];

  @HasMany(() => SoftwareLicenseAssignment, {
    foreignKey: "assetId",
  })
  installations?: SoftwareLicenseAssignment[];

  // ============================================================
  // HISTORY
  // ============================================================

  @HasMany(() => AssetHistory, {
    foreignKey: "asset_id",
  })
  history?: AssetHistory[];

  // ============================================================
  // INVENTORY HISTORY
  // ============================================================

  @HasMany(() => InventoryHistory, {
    foreignKey: "asset_id",
  })
  inventoryHistory?: InventoryHistory[];
}
