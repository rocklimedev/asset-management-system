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
} from "sequelize-typescript";

import { Organisation } from "./organisation.model";
import { Department } from "./department.model";
import { Location } from "./location.model";
import { AssetAssignment } from "../../assets/models/asset-assignment.model";
import { AssetTransfer } from "../../assets/models/asset-transfer.model";
import { User } from "../../users/models/user.model";

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
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  employeeCode!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  phone?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  avatarUrl?: string;

  @Index
  @ForeignKey(() => Organisation)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  organisationId?: number;

  @BelongsTo(() => Organisation)
  organisation?: Organisation;

  @Index
  @ForeignKey(() => Department)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  departmentId?: number;

  @BelongsTo(() => Department)
  department?: Department;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  designation?: string;

  @Index
  @ForeignKey(() => Employee)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  managerId?: number;

  @BelongsTo(() => Employee, "managerId")
  manager?: Employee;

  @HasMany(() => Employee, "managerId")
  reports!: Employee[];

  @Index
  @ForeignKey(() => Location)
  @Column({
    type: DataType.INTEGER,
    allowNull: true,
  })
  locationId?: number;

  @BelongsTo(() => Location)
  location?: Location;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(EmployeeStatus)),
    allowNull: false,
    defaultValue: EmployeeStatus.ACTIVE,
  })
  status!: EmployeeStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  joiningDate?: Date;

  @HasMany(() => AssetAssignment)
  assignments!: AssetAssignment[];

  @HasMany(() => AssetTransfer, "fromEmployeeId")
  transfersFrom!: AssetTransfer[];

  @HasMany(() => AssetTransfer, "toEmployeeId")
  transfersTo!: AssetTransfer[];

  @HasOne(() => User)
  user?: User;
}
