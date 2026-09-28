import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from "sequelize";

import { Asset } from "@/modules/assets/models/asset.model";

export enum SoftwareUsage {
  IN_USE = "IN_USE",
  NOT_IN_USE = "NOT_IN_USE",
  OCCASIONAL = "OCCASIONAL",
  TRIAL = "TRIAL",
  BLOCKED = "BLOCKED",
  UNKNOWN = "UNKNOWN",
}

export enum SoftwareSubscriptionType {
  OPEN_SOURCE = "OPEN_SOURCE",
  FREE = "FREE",
  SUBSCRIPTION = "SUBSCRIPTION",
  PERPETUAL = "PERPETUAL",
  TRIAL = "TRIAL",
  COMPANY_LICENSE = "COMPANY_LICENSE",
  UNKNOWN = "UNKNOWN",
}

@Table({
  tableName: "software_details",
  timestamps: true,
})
export class SoftwareDetails extends Model<
  InferAttributes<SoftwareDetails>,
  InferCreationAttributes<SoftwareDetails>
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
  // SOFTWARE ASSET
  //
  // One Asset(SOFTWARE) -> One SoftwareDetails
  // ============================================================

  @Index
  @ForeignKey(() => Asset)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    unique: true,
    field: "asset_id",
  })
  declare assetId: string;

  @BelongsTo(() => Asset, {
    foreignKey: "assetId",
    as: "asset",
  })
  declare asset?: NonAttribute<Asset>;

  // ============================================================
  // PARENT SOFTWARE (an ASSET id, not a details id)
  //
  // Microsoft 365 -> Word, Excel, PowerPoint, Outlook
  // Adobe Creative Cloud -> Photoshop, Premiere Pro, After Effects
  // ============================================================

  @Index
  @ForeignKey(() => Asset)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "parent_software_id",
  })
  declare parentSoftwareId: CreationOptional<string | null>;

  @BelongsTo(() => Asset, {
    foreignKey: "parentSoftwareId",
    as: "parentSoftware",
  })
  declare parentSoftware?: NonAttribute<Asset | null>;

  // ============================================================
  // USAGE
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(SoftwareUsage)),
    allowNull: false,
    defaultValue: SoftwareUsage.UNKNOWN,
  })
  declare usage: CreationOptional<SoftwareUsage>;

  // ============================================================
  // SUBSCRIPTION / LICENSE TYPE
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(SoftwareSubscriptionType)),
    allowNull: false,
    defaultValue: SoftwareSubscriptionType.UNKNOWN,
    field: "subscription_type",
  })
  declare subscriptionType: CreationOptional<SoftwareSubscriptionType>;

  // ============================================================
  // WARRANTY
  // ============================================================

  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: "warranty_applicable",
  })
  declare warrantyApplicable: CreationOptional<boolean>;

  // ============================================================
  // VERSION / EDITION / PUBLISHER / NOTES
  // ============================================================

  @Column({ type: DataType.STRING(100), allowNull: true })
  declare version: CreationOptional<string | null>;

  @Column({ type: DataType.STRING(150), allowNull: true })
  declare edition: CreationOptional<string | null>;

  @Column({ type: DataType.STRING(255), allowNull: true })
  declare publisher: CreationOptional<string | null>;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare notes: CreationOptional<string | null>;

  // ============================================================
  // TIMESTAMPS (managed by Sequelize because timestamps: true)
  // ============================================================

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
