import { Table, Column, Model, DataType, HasMany } from "sequelize-typescript";

import { Asset } from "./asset.model";

@Table({
  tableName: "vendors",
  timestamps: true,
  updatedAt: false,
})
export class Vendor extends Model<Vendor> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  name!: string;

  @HasMany(() => Asset)
  assets!: Asset[];
}
