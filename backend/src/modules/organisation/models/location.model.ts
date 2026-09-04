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

import { Organisation } from "./organisation.model";
import { Employee } from "./employees.model";
import { Asset } from "@/modules/assets/models/asset.model";

@Table({
  tableName: "locations",
  timestamps: true,
  updatedAt: false,
})
export class Location extends Model<Location> {
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
  // ORGANISATION
  // ============================================================

  @Index
  @ForeignKey(() => Organisation)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "organisation_id",
  })
  organisationId?: string | null;

  @BelongsTo(() => Organisation, {
    foreignKey: "organisation_id",
  })
  organisation?: Organisation;

  // ============================================================
  // EMPLOYEES
  // ============================================================

  @HasMany(() => Employee, {
    foreignKey: "location_id",
  })
  employees!: Employee[];

  // ============================================================
  // ASSETS
  // ============================================================

  @HasMany(() => Asset, {
    foreignKey: "location_id",
  })
  assets!: Asset[];
}
