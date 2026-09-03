import { Table, Column, Model, DataType, HasMany } from "sequelize-typescript";

import { RolePermission } from "./role-permission.model";
import { User } from "../../users/models/user.model";

@Table({
  tableName: "roles",
  timestamps: false,
})
export class Role extends Model<Role> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  description?: string;

  @HasMany(() => RolePermission)
  permissions!: RolePermission[];

  @HasMany(() => User)
  users!: User[];
}
