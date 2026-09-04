import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Index,
} from "sequelize-typescript";

@Table({
  tableName: "departments",
  timestamps: true,
  updatedAt: false,
})
export class Department extends Model<Department> {
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
  // NAME
  // ============================================================

  @Index
  @Column({
    type: DataType.STRING(255),
    allowNull: false,
    unique: true,
  })
  name!: string;
}
