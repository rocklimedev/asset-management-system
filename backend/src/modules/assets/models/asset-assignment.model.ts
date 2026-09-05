import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
  PrimaryKey,
  Default,
} from "sequelize-typescript";
import {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";
import { Asset } from "./asset.model";
import { Employee } from "@/modules/organisation/models/employees.model";

export enum AssignmentStatus {
  ACTIVE = "ACTIVE",
  RETURNED = "RETURNED",
}

@Table({
  tableName: "asset_assignments",
  timestamps: false,
})
export class AssetAssignment extends Model<
  InferAttributes<AssetAssignment>,
  InferCreationAttributes<AssetAssignment>
> {
  // ============================================================
  // PRIMARY KEY
  // ============================================================

  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  declare id: CreationOptional<string>;

  // ============================================================
  // ASSET
  // ============================================================

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
  declare asset?: Asset;

  // ============================================================
  // EMPLOYEE
  // ============================================================

  @Index
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "employee_id",
  })
  declare employeeId: string;

  @BelongsTo(() => Employee, {
    foreignKey: "employeeId",
    targetKey: "id",
  })
  declare employee?: Employee;

  // ============================================================
  // ASSIGNED AT
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: "assignedAt",
  })
  declare assignedAt: CreationOptional<Date>;

  // ============================================================
  // RETURNED AT
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: "returnedAt",
  })
  declare returnedAt: Date | null;

  // ============================================================
  // ASSIGNED BY
  // ============================================================

  @Index
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "assigned_by",
  })
  declare assignedBy: string;

  // ============================================================
  // STATUS
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(AssignmentStatus)),
    allowNull: false,
    defaultValue: AssignmentStatus.ACTIVE,
    field: "status",
  })
  declare status: CreationOptional<AssignmentStatus>;

  // ============================================================
  // NOTES
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: "notes",
  })
  declare notes: string | null;
}
