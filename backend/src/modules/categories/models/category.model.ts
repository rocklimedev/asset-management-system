import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index,
} from "sequelize-typescript";

import { Organisation } from "../organisations/organisation.model";
import { Asset } from "../assets/asset.model";
import { Inventory } from "../inventory/inventory.model";

@Table({
  tableName: "categories",
  timestamps: true,
  createdAt: "createdAt",
  updatedAt: "updatedAt",
})
export class Category extends Model<Category> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Index
  @Column(DataType.STRING(255))
  declare name: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare description: string | null;

  @AllowNull(false)
  @ForeignKey(() => Organisation)
  @Index
  @Column(DataType.UUID)
  declare organisationId: string;

  @Default(true)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  declare isActive: boolean;

  // ==========================================================
  // RELATIONSHIPS
  // ==========================================================

  @BelongsTo(() => Organisation)
  declare organisation: Organisation;

  @HasMany(() => Asset)
  declare assets: Asset[];

  @HasMany(() => Inventory)
  declare inventory: Inventory[];

  // ==========================================================
  // TIMESTAMPS
  // ==========================================================

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}
