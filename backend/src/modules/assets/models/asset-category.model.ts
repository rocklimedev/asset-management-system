import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index,
  PrimaryKey,
} from "sequelize-typescript";

import { Organisation } from "@/modules/organisation/models/organisation.model";
import { Asset } from "./asset.model";

export enum AssetKind {
  HARDWARE = "HARDWARE",
  SOFTWARE = "SOFTWARE",
}

@Table({
  tableName: "asset_categories",
  timestamps: true,
})
export class AssetCategory extends Model<AssetCategory> {
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
  // NAME
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name!: string;

  // ============================================================
  // DESCRIPTION
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string | null;

  // ============================================================
  // TYPE
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(AssetKind)),
    allowNull: false,
  })
  type!: AssetKind;

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
  // ACTIVE
  // ============================================================

  @Index
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  isActive!: boolean;

  // ============================================================
  // ASSETS
  // ============================================================

  @HasMany(() => Asset, {
    foreignKey: "category_id",
  })
  assets!: Asset[];
}
