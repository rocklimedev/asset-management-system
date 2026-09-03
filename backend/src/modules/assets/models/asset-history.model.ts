import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
} from "sequelize-typescript";

import { Asset } from "./asset.model";

@Table({
  tableName: "asset_history",
  timestamps: false,
})
export class AssetHistory extends Model<AssetHistory> {
  @Index
  @ForeignKey(() => Asset)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  assetId!: number;

  @BelongsTo(() => Asset)
  asset!: Asset;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  action!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  performedBy!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  fromValue?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  toValue?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes?: string;

  @Index
  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  createdAt!: Date;
}
