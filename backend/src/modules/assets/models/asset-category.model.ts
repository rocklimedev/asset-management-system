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
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
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
export class AssetCategory extends Model<
  InferAttributes<AssetCategory>,
  InferCreationAttributes<AssetCategory>
> {
  // ============================================================
  // ID
  // ============================================================

  @PrimaryKey
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    defaultValue: DataType.UUIDV4,
  })
  declare id: CreationOptional<string>;

  // ============================================================
  // NAME
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  declare name: string;

  // ============================================================
  // DESCRIPTION
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  declare description: string | null;

  // ============================================================
  // TYPE
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(AssetKind)),
    allowNull: false,
  })
  declare type: AssetKind;

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
  declare organisationId: string | null;

  @BelongsTo(() => Organisation, {
    foreignKey: "organisationId",
  })
  declare organisation?: Organisation;

  // ============================================================
  // ACTIVE
  // ============================================================

  @Index
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  declare isActive: CreationOptional<boolean>;

  // ============================================================
  // ASSETS
  // ============================================================

  @HasMany(() => Asset, {
    foreignKey: "categoryId",
  })
  declare assets?: Asset[];

  // ============================================================
  // TIMESTAMPS
  // ============================================================

  @CreatedAt
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt
  declare updatedAt: CreationOptional<Date>;
}
