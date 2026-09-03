import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
} from 'sequelize-typescript';

import { RolePermission } from './role-permission.model';

@Table({
  tableName: 'permissions',
  timestamps: false,
})
export class Permission extends Model<Permission> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  key!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  description!: string;

  @HasMany(() => RolePermission)
  roles!: RolePermission[];
}