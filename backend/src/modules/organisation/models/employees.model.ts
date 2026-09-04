import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  HasOne,
  Index,
  PrimaryKey,
} from "sequelize-typescript";

import { Organisation } from "./organisation.model";
import { Department } from "./department.model";
import { Location } from "./location.model";

import { AssetAssignment } from "@/modules/assets/models/asset-assignment.model";
import { AssetTransfer } from "@/modules/assets/models/asset-transfer.model";
import { User } from "@/modules/users/models/user.model";

export enum EmployeeStatus {
  ACTIVE = "ACTIVE",
  ON_LEAVE = "ON_LEAVE",
  INACTIVE = "INACTIVE",
  EXITED = "EXITED",
}

@Table({
  tableName: "employees",
  timestamps: true,
})
export class Employee extends Model<Employee> {
  // ============================================================
  // ID
  // ============================================================

  @PrimaryKey
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  // ============================================================
  // EMPLOYEE CODE
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  employeeCode!: string;

  // ============================================================
  // NAME
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  name!: string;

  // ============================================================
  // EMAIL
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
    unique: true,
  })
  email?: string | null;

  // ============================================================
  // PHONE
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  phone?: string | null;

  // ============================================================
  // AVATAR
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  avatarUrl?: string | null;

  // ============================================================
  // ORGANISATION
  // ============================================================

  @Index
  @ForeignKey(() => Organisation)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "organisation_id",
  })
  organisationId?: string | null;

  @BelongsTo(() => Organisation, {
    foreignKey: "organisation_id",
  })
  organisation?: Organisation;

  // ============================================================
  // DEPARTMENT
  // ============================================================

  @Index
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "department_id",
  })
  departmentId?: string | null;

  @BelongsTo(() => Department, {
    foreignKey: "department_id",
  })
  department?: Department;
  // ============================================================
  // DESIGNATION
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  designation?: string | null;

  // ============================================================
  // MANAGER
  // ============================================================

  @Index
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "manager_id",
  })
  managerId?: string | null;

  @BelongsTo(() => Employee, {
    foreignKey: "manager_id",
  })
  manager?: Employee;

  // ============================================================
  // DIRECT REPORTS
  // ============================================================

  @HasMany(() => Employee, {
    foreignKey: "manager_id",
  })
  reports!: Employee[];

  // ============================================================
  // LOCATION
  // ============================================================

  @Index
  @ForeignKey(() => Location)
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "location_id",
  })
  locationId?: string | null;

  @BelongsTo(() => Location, {
    foreignKey: "location_id",
  })
  location?: Location;

  // ============================================================
  // STATUS
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(EmployeeStatus)),
    allowNull: false,
    defaultValue: EmployeeStatus.ACTIVE,
  })
  status!: EmployeeStatus;

  // ============================================================
  // JOINING DATE
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  joiningDate?: Date | null;

  // ============================================================
  // ASSET ASSIGNMENTS
  // ============================================================

  @HasMany(() => AssetAssignment, {
    foreignKey: "employee_id",
  })
  assignments!: AssetAssignment[];

  // ============================================================
  // ASSET TRANSFERS - FROM
  // ============================================================

  @HasMany(() => AssetTransfer, {
    foreignKey: "from_employee_id",
  })
  transfersFrom!: AssetTransfer[];

  // ============================================================
  // ASSET TRANSFERS - TO
  // ============================================================

  @HasMany(() => AssetTransfer, {
    foreignKey: "to_employee_id",
  })
  transfersTo!: AssetTransfer[];

  // ============================================================
  // USER
  // ============================================================

  @HasOne(() => User)
  user?: User;
}
