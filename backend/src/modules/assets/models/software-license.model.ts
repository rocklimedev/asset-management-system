import {
  Table,
  Column,
  Model,
  DataType,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany,
  Index,
  PrimaryKey,
} from "sequelize-typescript";
import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from "sequelize";

import { Asset } from "./asset.model";
import { SoftwareLicenseAssignment } from "./software-license-assignment.model";

@Table({
  tableName: "software_licenses",
  timestamps: false,
})
export class SoftwareLicense extends Model<
  InferAttributes<SoftwareLicense>,
  InferCreationAttributes<SoftwareLicense>
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  declare id: CreationOptional<string>;

  // ---------------- ASSET ----------------

  @Index
  @ForeignKey(() => Asset)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "asset_id",
  })
  declare assetId: string;

  @BelongsTo(() => Asset, {
    foreignKey: "assetId",
    targetKey: "id",
  })
  declare asset?: NonAttribute<Asset>;

  // ---------------- DETAILS ----------------

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  declare vendor: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  declare licenseType: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  declare licenseReference: CreationOptional<string | null>;

  // ---------------- SEATS ----------------

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 1,
  })
  declare totalSeats: CreationOptional<number>;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  declare assignedSeats: CreationOptional<number>;

  // ---------------- DATES / COST ----------------

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare purchaseDate: CreationOptional<Date | null>;

  @Index
  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare expiryDate: CreationOptional<Date | null>;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  declare renewalDate: CreationOptional<Date | null>;

  @Column({
    type: DataType.DECIMAL(12, 2),
    allowNull: true,
  })
  declare cost: CreationOptional<number | null>;

  // ---------------- ASSIGNMENTS ----------------

  @HasMany(() => SoftwareLicenseAssignment, {
    foreignKey: "licenseId",
  })
  declare assignments?: NonAttribute<SoftwareLicenseAssignment[]>;
}
