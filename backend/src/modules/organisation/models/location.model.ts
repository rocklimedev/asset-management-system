import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index,
} from "sequelize-typescript";

import { Organisation } from "./organisation.model";
import { Employee } from "./employees.model";
import { Asset } from "../../assets/models/asset.model";

@Table({
  tableName: "locations",
  timestamps: true,
  updatedAt: false,
})
export class Location extends Model<Location> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  name!: string;

  @Index
  @ForeignKey(() => Organisation)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  organisationId?: number;

  @BelongsTo(() => Organisation)
  organisation?: Organisation;

  @HasMany(() => Employee)
  employees!: Employee[];

  @HasMany(() => Asset)
  assets!: Asset[];
}
