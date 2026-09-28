import {
  Table,
  Column,
  Model,
  DataType,
  Default,
  ForeignKey,
  BelongsTo,
  Index,
  PrimaryKey,
} from "sequelize-typescript";
import {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from "sequelize";

import { SoftwareLicense } from "./software-license.model";
import { Asset } from "./asset.model";
import { System } from "./system.model";

export enum SoftwareInstallationStatus {
  INSTALLED = "INSTALLED",
  NOT_INSTALLED = "NOT_INSTALLED",
  UNINSTALLED = "UNINSTALLED",
  BLOCKED = "BLOCKED",
  UNKNOWN = "UNKNOWN",
}

export enum SoftwareAssignmentStatus {
  ACTIVE = "ACTIVE",
  REMOVED = "REMOVED",
}

@Table({
  tableName: "software_license_assignments",
  timestamps: true,
})
export class SoftwareLicenseAssignment extends Model<
  InferAttributes<SoftwareLicenseAssignment>,
  InferCreationAttributes<SoftwareLicenseAssignment>
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.CHAR(36), allowNull: false })
  declare id: CreationOptional<string>;

  // ---------------- SOFTWARE ASSET ----------------

  @Index
  @ForeignKey(() => Asset)
  @Column({ type: DataType.CHAR(36), allowNull: false, field: "asset_id" })
  declare assetId: string;

  @BelongsTo(() => Asset, { foreignKey: "assetId", targetKey: "id" })
  declare asset?: NonAttribute<Asset>;

  // ---------------- LICENSE ----------------

  @Index
  @ForeignKey(() => SoftwareLicense)
  @Column({ type: DataType.CHAR(36), allowNull: true, field: "license_id" })
  declare licenseId: CreationOptional<string | null>;

  @BelongsTo(() => SoftwareLicense, {
    foreignKey: "licenseId",
    targetKey: "id",
  })
  declare license?: NonAttribute<SoftwareLicense>;

  // ---------------- SYSTEM ----------------

  @Index
  @ForeignKey(() => System)
  @Column({ type: DataType.CHAR(36), allowNull: false, field: "system_id" })
  declare systemId: string;

  @BelongsTo(() => System, { foreignKey: "systemId", targetKey: "id" })
  declare system?: NonAttribute<System>;

  // ---------------- STATUSES ----------------

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(SoftwareInstallationStatus)),
    allowNull: false,
    defaultValue: SoftwareInstallationStatus.INSTALLED,
    field: "installation_status",
  })
  declare installationStatus: CreationOptional<SoftwareInstallationStatus>;

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(SoftwareAssignmentStatus)),
    allowNull: false,
    defaultValue: SoftwareAssignmentStatus.ACTIVE,
    field: "assignment_status",
  })
  declare assignmentStatus: CreationOptional<SoftwareAssignmentStatus>;

  // ---------------- VERSION / DATES / NOTES ----------------

  @Column({ type: DataType.STRING(100), allowNull: true })
  declare version: CreationOptional<string | null>;

  @Column({ type: DataType.DATE, allowNull: true, field: "installed_at" })
  declare installedAt: CreationOptional<Date | null>;

  @Column({ type: DataType.DATE, allowNull: true, field: "removed_at" })
  declare removedAt: CreationOptional<Date | null>;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare notes: CreationOptional<string | null>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
