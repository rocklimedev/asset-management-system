import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { Employee } from '../organisation/models/employees.model';

@Table({ tableName: 'employee_credentials', timestamps: true })
export class Credential extends Model<Credential> {
  @PrimaryKey @Column({ type: DataType.CHAR(36), defaultValue: DataType.UUIDV4 }) id!: string;
  @ForeignKey(() => Employee) @Column({ type: DataType.CHAR(36), allowNull: false }) employeeId!: string;
  @BelongsTo(() => Employee) employee!: Employee;
  @Column({ type: DataType.STRING(255), allowNull: false }) title!: string;
  @Column({ type: DataType.STRING(100), allowNull: false }) category!: string;
  @Column({ type: DataType.TEXT, allowNull: false }) purpose!: string;
  @Column({ type: DataType.STRING(255), allowNull: false }) systemLabel!: string;
  @Column({ type: DataType.TEXT, allowNull: false }) encryptedUsername!: string;
  @Column({ type: DataType.TEXT, allowNull: false }) encryptedPassword!: string;
}
