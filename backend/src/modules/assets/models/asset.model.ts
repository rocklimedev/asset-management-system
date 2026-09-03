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
} from "sequelize-typescript";

import { Organisation } from "../../organisation/models/organisation.model";
import { AssetCategory } from "./asset-category.model";
import { Vendor } from "./vendor.model";
import { Location } from "../../organisation/models/location.model";

import { SoftwareLicense } from "./software-license.model";
import { AssetAssignment } from "./asset-assignment.model";
import { AssetTransfer } from "./asset-transfer.model";
import { AssetHistory } from "./asset-history.model";

import { AssetKind } from "./asset-category.model";

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
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  assetTag!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(AssetKind)),
    allowNull: false,
  })
  kind!: AssetKind;

  @Index
  @ForeignKey(() => Organisation)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  organisationId!: number;

  @BelongsTo(() => Organisation)
  organisation!: Organisation;

  @Index
  @ForeignKey(() => AssetCategory)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  categoryId!: number;

  @BelongsTo(() => AssetCategory)
  category!: AssetCategory;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  manufacturer?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  model?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true,
  })
  serialNumber?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  purchaseDate?: Date;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
  })
  purchasePrice?: number;

  @ForeignKey(() => Vendor)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  vendorId?: number;

  @BelongsTo(() => Vendor)
  vendor?: Vendor;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  invoiceNumber?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  warrantyStart?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  warrantyExpiry?: Date;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(AssetStatus)),
    allowNull: false,
    defaultValue: AssetStatus.AVAILABLE,
  })
  status!: AssetStatus;

  @Column({
    type: DataType.ENUM(...Object.values(AssetCondition)),
    allowNull: false,
    defaultValue: AssetCondition.GOOD,
  })
  condition!: AssetCondition;

  @Index
  @ForeignKey(() => Location)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  locationId?: number;

  @BelongsTo(() => Location)
  location?: Location;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes?: string;

  @HasOne(() => SoftwareLicense)
  license?: SoftwareLicense;

  @HasMany(() => AssetAssignment)
  assignments!: AssetAssignment[];

  @HasMany(() => AssetTransfer)
  transfers!: AssetTransfer[];

  @HasMany(() => AssetHistory)
  history!: AssetHistory[];
}
