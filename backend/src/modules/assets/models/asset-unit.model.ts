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
import { Optional } from "sequelize";

import { Asset } from "./asset.model";
import { AssetAssignment } from "./asset-assignment.model";
import { Location } from "@/modules/organisation/models/location.model";

export enum AssetUnitStatus {
  AVAILABLE = "AVAILABLE",
  ASSIGNED = "ASSIGNED",
  REPAIR = "REPAIR",
  LOST = "LOST",
  DAMAGED = "DAMAGED",
  RETIRED = "RETIRED",
  DISPOSED = "DISPOSED",
}

export enum AssetUnitCondition {
  NEW = "NEW",
  GOOD = "GOOD",
  FAIR = "FAIR",
  POOR = "POOR",
}

export interface AssetUnitAttributes {
  id: string;
  assetId: string;
  unitCode?: string | null;
  serialNumber?: string | null;
  cellularIdentities?: { imei?: string; simNumber?: string }[] | null;
  status: AssetUnitStatus;
  condition: AssetUnitCondition;
  locationId?: string | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type AssetUnitCreationAttributes = Optional<
  AssetUnitAttributes,
  | "id"
  | "unitCode"
  | "serialNumber"
  | "cellularIdentities"
  | "status"
  | "condition"
  | "locationId"
  | "notes"
  | "createdAt"
  | "updatedAt"
>;

@Table({
  tableName: "asset_units",
  timestamps: true,
})
export class AssetUnit extends Model<
  AssetUnitAttributes,
  AssetUnitCreationAttributes
> {
  @PrimaryKey
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  @Index
  @ForeignKey(() => Asset)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "asset_id",
  })
  assetId!: string;

  @BelongsTo(() => Asset, {
    foreignKey: "assetId",
    targetKey: "id",
  })
  asset!: Asset;

  @Index({ unique: true })
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: "unit_code",
  })
  unitCode?: string | null;

  @Index({ unique: true })
  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    field: "serial_number",
  })
  serialNumber?: string | null;

  @Column({ type: DataType.JSON, allowNull: true, field: "cellular_identities" })
  cellularIdentities?: { imei?: string; simNumber?: string }[] | null;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(AssetUnitStatus)),
    allowNull: false,
    defaultValue: AssetUnitStatus.AVAILABLE,
  })
  status!: AssetUnitStatus;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(AssetUnitCondition)),
    allowNull: false,
    defaultValue: AssetUnitCondition.GOOD,
  })
  condition!: AssetUnitCondition;

  @Index
  @ForeignKey(() => Location)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "location_id",
  })
  locationId?: string | null;

  @BelongsTo(() => Location, { foreignKey: "locationId" })
  location?: Location;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes?: string | null;

  @HasMany(() => AssetAssignment, {
    foreignKey: "assetUnitId",
  })
  assignments!: AssetAssignment[];
}
