import { Table, Column, Model, DataType, HasMany } from "sequelize-typescript";

import { Employee } from "./employees.model";

@Table({
  tableName: "departments",
  timestamps: true,
  updatedAt: false,
})
export class Department extends Model<Department> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  name!: string;

  @HasMany(() => Employee)
  employees!: Employee[];
}
