import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  BeforeCreate,
  BeforeUpdate,
} from "sequelize-typescript";

import * as bcrypt from "bcrypt";

import { System } from "./system.model";

@Table({
  tableName: "system_specs",
  timestamps: true,
})
export class SystemSpecs extends Model<SystemSpecs> {
  // ============================================================
  // ID
  // ============================================================

  @PrimaryKey
  @Column({
    type: DataType.CHAR(36),
    defaultValue: DataType.UUIDV4,
  })
  id!: string;

  // ============================================================
  // SYSTEM
  // ============================================================

  @ForeignKey(() => System)
  @Column({
    type: DataType.CHAR(36),
    field: "system_id",
    allowNull: false,
    unique: true,
  })
  systemId!: string;

  @BelongsTo(() => System, "systemId")
  system?: System;

  // ============================================================
  // HARDWARE
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  processor!: string | null;

  @Column({
    type: DataType.STRING(100),
    allowNull: true,
  })
  ram!: string | null;

  @Column({
    type: DataType.STRING(255),
    field: "local_storage",
    allowNull: true,
  })
  localStorage!: string | null;

  @Column({
    type: DataType.STRING(255),
    field: "graphics_card",
    allowNull: true,
  })
  graphicsCard!: string | null;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  motherboard!: string | null;

  @Column({
    type: DataType.STRING(255),
    field: "power_supply",
    allowNull: true,
  })
  powerSupply!: string | null;

  // ============================================================
  // DISPLAY
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  monitor!: string | null;

  @Column({
    type: DataType.STRING(100),
    field: "monitor_size",
    allowNull: true,
  })
  monitorSize!: string | null;

  // ============================================================
  // SOFTWARE
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    field: "operating_system",
    allowNull: true,
  })
  operatingSystem!: string | null;

  @Column({
    type: DataType.STRING(100),
    field: "os_version",
    allowNull: true,
  })
  osVersion!: string | null;

  // ============================================================
  // CLOUD STORAGE
  // ============================================================

  @Column({
    type: DataType.STRING(255),
    field: "cloud_storage",
    allowNull: true,
  })
  cloudStorage!: string | null;

  @Column({
    type: DataType.STRING(255),
    field: "cloud_storage_email",
    allowNull: true,
  })
  cloudStorageEmail!: string | null;

  @Column({
    type: DataType.STRING(255),
    field: "cloud_storage_password",
    allowNull: true,
  })
  cloudStoragePassword!: string | null;

  // ============================================================
  // NETWORK
  // ============================================================

  @Column({
    type: DataType.STRING(100),
    field: "mac_address",
    allowNull: true,
  })
  macAddress!: string | null;

  @Column({
    type: DataType.STRING(100),
    field: "ip_address",
    allowNull: true,
  })
  ipAddress!: string | null;

  // ============================================================
  // OTHER
  // ============================================================

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  notes!: string | null;

  // ============================================================
  // PASSWORD HASHING
  // ============================================================

  @BeforeCreate
  static async hashPassword(instance: SystemSpecs) {
    if (instance.cloudStoragePassword) {
      instance.cloudStoragePassword = await bcrypt.hash(
        instance.cloudStoragePassword,
        12,
      );
    }
  }

  @BeforeUpdate
  static async hashPasswordOnUpdate(instance: SystemSpecs) {
    if (instance.changed("cloudStoragePassword")) {
      const password = instance.cloudStoragePassword;

      if (
        password &&
        !password.startsWith("$2a$") &&
        !password.startsWith("$2b$") &&
        !password.startsWith("$2y$")
      ) {
        instance.cloudStoragePassword = await bcrypt.hash(password, 12);
      }
    }
  }
}
