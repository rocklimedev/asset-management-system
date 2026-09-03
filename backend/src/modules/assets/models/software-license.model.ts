import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";

import { Asset } from "./asset.model";

@Table({
  tableName: "software_licenses",
  timestamps: false,
})
export class SoftwareLicense extends Model<SoftwareLicense> {
  @ForeignKey(() => Asset)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    unique: true,
  })
  assetId!: number;

  @BelongsTo(() => Asset)
  asset!: Asset;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  vendor!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  licenseType!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  licenseReference!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  totalSeats!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  assignedSeats!: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  purchaseDate?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  expiryDate?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  renewalDate?: Date;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
  })
  cost?: number;
}
