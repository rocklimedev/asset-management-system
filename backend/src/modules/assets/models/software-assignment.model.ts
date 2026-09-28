import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  Index,
  PrimaryKey,
  Default,
} from "sequelize-typescript";

import {
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
} from "sequelize";

import { Asset } from "./asset.model";
import { System } from "./system.model";

export enum SoftwareAssignmentStatus {
  ACTIVE = "ACTIVE",
  RETURNED = "RETURNED",
  REVOKED = "REVOKED",
}

@Table({
  tableName: "software_assignments",
  timestamps: false,
})
export class SoftwareAssignment extends Model<
  InferAttributes<SoftwareAssignment>,
  InferCreationAttributes<SoftwareAssignment>
> {
  // ============================================================
  // PRIMARY KEY
  // ============================================================

  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
  })
  declare id: CreationOptional<string>;

  // ============================================================
  // SOFTWARE ASSET
  //
  // Points to Asset where:
  //
  // Asset.kind = SOFTWARE
  //
  // Example:
  //
  // Asset
  //   name = Photoshop
  //   kind = SOFTWARE
  // ============================================================

  @Index
  @ForeignKey(() => Asset)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "software_asset_id",
  })
  declare softwareAssetId: string;

  @BelongsTo(() => Asset, {
    foreignKey: "softwareAssetId",
    targetKey: "id",
  })
  declare softwareAsset?: Asset;

  // ============================================================
  // SYSTEM
  //
  // Software is assigned to a system.
  //
  // System is then assigned to an employee.
  //
  // Software
  //    ↓
  // System
  //    ↓
  // Employee
  // ============================================================

  @Index
  @ForeignKey(() => System)
  @Column({
    type: DataType.CHAR(36),
    allowNull: false,
    field: "system_id",
  })
  declare systemId: string;

  @BelongsTo(() => System, {
    foreignKey: "systemId",
    targetKey: "id",
  })
  declare system?: System;

  // ============================================================
  // ASSIGNMENT STATUS
  // ============================================================

  @Index
  @Column({
    type: DataType.ENUM(...Object.values(SoftwareAssignmentStatus)),
    allowNull: false,
    defaultValue: SoftwareAssignmentStatus.ACTIVE,
    field: "status",
  })
  declare status: CreationOptional<SoftwareAssignmentStatus>;

  // ============================================================
  // ASSIGNED AT
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: false,
    defaultValue: DataType.NOW,
    field: "assigned_at",
  })
  declare assignedAt: CreationOptional<Date>;

  // ============================================================
  // RETURNED / REVOKED AT
  // ============================================================

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: "ended_at",
  })
  declare endedAt: Date | null;

  // ============================================================
  // ASSIGNED BY
  //
  // User/admin who performed the assignment.
  // Kept as UUID without a User relation so this model doesn't
  // introduce an unnecessary dependency if your existing
  // assignment service handles the actor separately.
  // ============================================================

  @Index
  @Column({
    type: DataType.CHAR(36),
    allowNull: true,
    field: "assigned_by",
  })
  declare assignedBy: string | null;

  // ============================================================
  // NOTES
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
    field: "notes",
  })
  declare notes: string | null;
}
