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
import { Employee } from "../../organisation/models/employees.model";

export enum AssignmentStatus {
  ACTIVE = "ACTIVE",
  RETURNED = "RETURNED",
}

@Table({
  tableName: "asset_assignments",
  timestamps: false,
})
export class AssetAssignment extends Model<AssetAssignment> {
  @Index
  @ForeignKey(() => Asset)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  assetId!: number;

  @BelongsTo(() => Asset)
  asset!: Asset;

  @Index
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  employeeId!: number;

  @BelongsTo(() => Employee)
  employee!: Employee;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
  })
  assignedAt!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  returnedAt?: Date;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  assignedBy!: number;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(AssignmentStatus)),
    allowNull: false,
    defaultValue: AssignmentStatus.ACTIVE,
  })
  status!: AssignmentStatus;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes?: string;
}
