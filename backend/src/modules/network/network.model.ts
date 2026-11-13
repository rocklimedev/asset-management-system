import { Table, Column, Model, DataType } from 'sequelize-typescript';
@Table({ tableName: 'network_maps', timestamps: true })
export class NetworkMap extends Model {
  @Column({ type: DataType.UUID, primaryKey: true, defaultValue: DataType.UUIDV4 }) id!: string;
  @Column({ type: DataType.JSON, allowNull: false }) document!: Record<string, unknown>;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 }) revision!: number;
}
