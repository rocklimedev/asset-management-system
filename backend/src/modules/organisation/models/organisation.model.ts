import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  Index,
  PrimaryKey,
} from "sequelize-typescript";

import { Employee } from "./employees.model";
import { AssetCategory } from "@/modules/assets/models/asset-category.model";
import { Asset } from "@/modules/assets/models/asset.model";
import { Location } from "./location.model";

@Table({
  tableName: "organisations",
  timestamps: true,
})
export class Organisation extends Model<Organisation> {
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
    unique: true,
  })
  name!: string;

  // ============================================================
  // CODE
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    unique: true,
  })
  code?: string | null;

  // ============================================================
  // DESCRIPTION
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string | null;

  // ============================================================
  // ACTIVE STATUS
  // ============================================================

  @Index
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  isActive!: boolean;

  // ============================================================
  // EMPLOYEES
  // ============================================================

  @HasMany(() => Employee, {
    foreignKey: "organisation_id",
  })
  employees!: Employee[];

  // ============================================================
  // ASSET CATEGORIES
  // ============================================================

  @HasMany(() => AssetCategory, {
    foreignKey: "organisation_id",
  })
  categories!: AssetCategory[];

  // ============================================================
  // ASSETS
  // ============================================================

  @HasMany(() => Asset, {
    foreignKey: "organisation_id",
  })
  assets!: Asset[];

  // ============================================================
  // LOCATIONS
  // ============================================================

  @HasMany(() => Location, {
    foreignKey: "organisation_id",
  })
  locations!: Location[];
}
