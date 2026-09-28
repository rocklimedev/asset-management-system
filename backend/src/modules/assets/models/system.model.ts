import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  HasMany,
  HasOne,
  Index,
} from "sequelize-typescript";
import { SoftwareLicenseAssignment } from "./software-license-assignment.model";
import { Employee } from "@/modules/organisation/models/employees.model";
import { Organisation } from "@/modules/organisation/models/organisation.model";
import { AssetAssignment } from "./asset-assignment.model";
import { SystemSpecs } from "./system-specs.model";

@Table({
  tableName: "systems",
  timestamps: true,
})
export class System extends Model<System> {
  // ============================================================
  // BASIC INFORMATION
  // ============================================================

  @PrimaryKey
  @Column({
    type: DataType.CHAR(36),
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    unique: true,
  })
  systemTag!: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes!: string | null;

  // ============================================================
  // ORGANISATION
  // ============================================================

  @Index
  @ForeignKey(() => Organisation)
  @Column({
    type: DataType.CHAR(36),
    field: "organisation_id",
    allowNull: true,
  })
  organisationId!: string | null;

  @BelongsTo(() => Organisation, {
    foreignKey: "organisation_id",
  })
  organisation?: Organisation;

  // ============================================================
  // EMPLOYEE
  // ============================================================

  @ForeignKey(() => Employee)
  @Column({
    type: DataType.CHAR(36),
    field: "employee_id",
    allowNull: true,
  })
  employeeId!: string | null;

  @BelongsTo(() => Employee, {
    foreignKey: "employeeId",
  })
  employee?: Employee;

  // ============================================================
  // SYSTEM SPECS
  // ============================================================

  @HasOne(() => SystemSpecs, {
    foreignKey: "systemId",
  })
  specs?: SystemSpecs;
  // ============================================================
  // SOFTWARE
  // ============================================================

  @HasMany(() => SoftwareLicenseAssignment, {
    foreignKey: "systemId",
  })
  softwareAssignments?: SoftwareLicenseAssignment[];
  // ============================================================
  // ASSET ASSIGNMENTS
  // ============================================================

  @HasMany(() => AssetAssignment, {
    foreignKey: "systemId",
  })
  assignments?: AssetAssignment[];
}
