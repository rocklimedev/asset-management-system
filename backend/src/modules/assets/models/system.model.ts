import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo, HasMany } from "sequelize-typescript";
import { Employee } from "@/modules/organisation/models/employees.model";
import { AssetAssignment } from "./asset-assignment.model";

@Table({ tableName: "systems", timestamps: true })
export class System extends Model<System> {
  @PrimaryKey
  @Column({ type: DataType.CHAR(36), defaultValue: DataType.UUIDV4 })
  id!: string;

  @Column({ type: DataType.STRING(100), allowNull: false, unique: true })
  systemTag!: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  name!: string;

  @Column({ type: DataType.TEXT, allowNull: true })
  notes!: string | null;

  @ForeignKey(() => Employee)
  @Column({ type: DataType.CHAR(36), field: "employee_id", allowNull: true })
  employeeId!: string | null;

  @BelongsTo(() => Employee, "employeeId")
  employee?: Employee;

  @HasMany(() => AssetAssignment, "systemId")
  assignments?: AssetAssignment[];
}
