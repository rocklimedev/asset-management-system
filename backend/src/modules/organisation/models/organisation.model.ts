import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  Index,
} from "sequelize-typescript";

import { Employee } from "./employees.model";
import { AssetCategory } from "../../assets/models/asset-category.model";
import { Asset } from "../../assets/models/asset.model";
import { Location } from "./location.model";

@Table({
  tableName: "organisations",
  timestamps: true,
})
export class Organisation extends Model<Organisation> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true,
  })
  code?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string;

  @Index
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  isActive!: boolean;

  @HasMany(() => Employee)
  employees!: Employee[];

  @HasMany(() => AssetCategory)
  categories!: AssetCategory[];

  @HasMany(() => Asset)
  assets!: Asset[];

  @HasMany(() => Location)
  locations!: Location[];
}
