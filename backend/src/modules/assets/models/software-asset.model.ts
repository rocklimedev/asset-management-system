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

export enum SoftwareUsageStatus {
  ACTIVE = "ACTIVE",
  OCCASIONAL = "OCCASIONAL",
  RARE = "RARE",
  UNUSED = "UNUSED",
  NOT_IN_USE = "NOT_IN_USE",
  TRIAL = "TRIAL",
  NOT_INSTALLED = "NOT_INSTALLED",
  UNKNOWN = "UNKNOWN",
}

export enum SoftwareSubscriptionType {
  OPENSOURCE = "OPENSOURCE",
  FREE = "FREE",
  SUBSCRIPTION = "SUBSCRIPTION",
  COMPANY_PAID = "COMPANY_PAID",
  COMPANY_LICENSE = "COMPANY_LICENSE",
  PERPETUAL_LICENSE = "PERPETUAL_LICENSE",
  TRIAL = "TRIAL",
  NO_LICENSE_REQUIRED = "NO_LICENSE_REQUIRED",
  UNKNOWN = "UNKNOWN",
}

@Table({
  tableName: "software_assets",
  timestamps: true,
})
export class SoftwareAsset extends Model<SoftwareAsset> {
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

  @Index({ unique: true })
  @ForeignKey(() => Asset)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "asset_id",
    unique: true,
  })
  assetId!: string;

  @BelongsTo(() => Asset, {
    foreignKey: "assetId",
    targetKey: "id",
  })
  asset!: Asset;

  // ============================================================
  // PARENT SOFTWARE / PRODUCT FAMILY
  // ============================================================

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: "parent_software",
  })
  parentSoftware?: string | null;

  // ============================================================
  // PUBLISHER / VENDOR
  // ============================================================

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: "publisher",
  })
  publisher?: string | null;

  // ============================================================
  // USAGE
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(SoftwareUsageStatus)),
    allowNull: false,
    defaultValue: SoftwareUsageStatus.UNKNOWN,
  })
  usageStatus!: SoftwareUsageStatus;

  // ============================================================
  // SUBSCRIPTION / LICENSE MODEL
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(SoftwareSubscriptionType)),
    allowNull: false,
    defaultValue: SoftwareSubscriptionType.UNKNOWN,
    field: "subscription_type",
  })
  subscriptionType!: SoftwareSubscriptionType;

  // ============================================================
  // VERSION
  // ============================================================

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  version?: string | null;

  // ============================================================
  // NOTES
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes?: string | null;
}
