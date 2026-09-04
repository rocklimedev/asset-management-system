import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  PrimaryKey,
  Index,
} from "sequelize-typescript";

import { Asset } from "./asset.model";

@Table({
  tableName: "vendors",
  timestamps: true,
  updatedAt: false,
})
export class Vendor extends Model<Vendor> {
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

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  name!: string;

  // ============================================================
  // ASSETS
  // ============================================================

  @HasMany(() => Asset, {
    foreignKey: "vendor_id",
  })
  assets!: Asset[];
}
