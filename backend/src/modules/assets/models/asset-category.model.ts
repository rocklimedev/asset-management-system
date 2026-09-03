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

import { Organisation } from "../../organisation/models/organisation.model";
import { Asset } from "./asset.model";

export enum AssetKind {
  HARDWARE = "HARDWARE",
  SOFTWARE = "SOFTWARE",
}

@Table({
  tableName: "asset_categories",
  timestamps: true,
})
export class AssetCategory extends Model<AssetCategory> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(AssetKind)),
    allowNull: false,
  })
  type!: AssetKind;

  @Index
  @ForeignKey(() => Organisation)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  organisationId!: number;

  @BelongsTo(() => Organisation)
  organisation!: Organisation;

  @Index
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  })
  isActive!: boolean;

  @HasMany(() => Asset)
  assets!: Asset[];
}
