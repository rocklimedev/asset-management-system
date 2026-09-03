import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({
  tableName: "settings",
  timestamps: false,
})
export class Setting extends Model<Setting> {
  @Column({
    type: DataType.STRING,
    allowNull: false,
    primaryKey: true,
  })
  key!: string;

  @Column({
    type: DataType.JSON,
    allowNull: false,
  })
  value!: unknown;
}
