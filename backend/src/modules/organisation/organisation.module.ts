import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

// ============================================================
// CONTROLLERS
// ============================================================

import { OrganisationsController } from "./organisation.controller";
import { EmployeesController } from "./employees.controller";

// ============================================================
// SERVICES
// ============================================================

import { OrganisationsService } from "./organisation.service";
import { EmployeesService } from "./employees.service";

// ============================================================
// ORGANISATION MODELS
// ============================================================

import { Organisation } from "./models/organisation.model";
import { Employee } from "./models/employees.model";
import { Department } from "./models/department.model";
import { Location } from "./models/location.model";

// ============================================================
// ASSET MODELS
// ============================================================

import { Asset } from "../assets/models/asset.model";
import { AssetCategory } from "../assets/models/asset-category.model";

// ============================================================
// AUDIT
// ============================================================

import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [
    // ==========================================================
    // AUDIT MODULE
    // ==========================================================

    AuditModule,

    // ==========================================================
    // SEQUELIZE MODELS
    // ==========================================================

    SequelizeModule.forFeature([
      // Organisation
      Organisation,
      Employee,
      Department,
      Location,

      // Assets
      Asset,
      AssetCategory,
    ]),
  ],

  // ============================================================
  // CONTROLLERS
  // ============================================================

  controllers: [OrganisationsController, EmployeesController],

  // ============================================================
  // SERVICES
  // ============================================================

  providers: [OrganisationsService, EmployeesService],

  // ============================================================
  // EXPORTS
  // ============================================================

  exports: [OrganisationsService, EmployeesService, SequelizeModule],
})
export class OrganisationsModule {}
