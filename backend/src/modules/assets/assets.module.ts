import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";
import { EventEmitterModule } from "@nestjs/event-emitter";

// Systems
import { System } from "./models/system.model";
import { SystemsController } from "./systems.controller";
import { SystemsService } from "./systems.service";

// Assets
import { Asset } from "./models/asset.model";
import { AssetsController } from "./assets.controller";
import { AssetsService } from "./assets.service";

// Asset Category
import { AssetCategory } from "./models/asset-category.model";
import { AssetCategoryController } from "./asset-category.controller";
import { AssetCategoryService } from "./asset-category.service";

// Asset Unit
import { AssetUnit } from "./models/asset-unit.model";
import { AssetUnitsController } from "./asset-units.controller";
import { AssetUnitsService } from "./asset-units.service";

// Asset History
import { AssetHistory } from "./models/asset-history.model";

// Asset Assignment
import { AssetAssignment } from "./models/asset-assignment.model";

// Asset Transfer
import { AssetTransfer } from "./models/asset-transfer.model";

// Software
import { SoftwareController } from "./software.controller";
import { SoftwareLicense } from "./models/software-license.model";

// Vendor
import { Vendor } from "./models/vendor.model";

// Inventory
import { InventoryHistory } from "./models/inventory-history.model";

// Organisation
import { Organisation } from "@/modules/organisation/models/organisation.model";
import { Employee } from "@/modules/organisation/models/employees.model";
import { Location } from "@/modules/organisation/models/location.model";

// Modules
import { AuditModule } from "@/modules/audit/audit.module";
import { CdnModule } from "@/modules/cdn/cdn.module";

@Module({
  imports: [
    SequelizeModule.forFeature([
      // ============================================================
      // SYSTEM
      // ============================================================
      System,

      // ============================================================
      // ASSET
      // ============================================================
      Asset,

      // ============================================================
      // ASSET UNIT
      // ============================================================
      AssetUnit,

      // ============================================================
      // ASSET CATEGORY
      // ============================================================
      AssetCategory,

      // ============================================================
      // ASSET HISTORY
      // ============================================================
      AssetHistory,

      // ============================================================
      // ASSET ASSIGNMENT
      // ============================================================
      AssetAssignment,

      // ============================================================
      // ASSET TRANSFER
      // ============================================================
      AssetTransfer,

      // ============================================================
      // SOFTWARE
      // ============================================================
      SoftwareLicense,

      // ============================================================
      // VENDOR
      // ============================================================
      Vendor,

      // ============================================================
      // INVENTORY
      // ============================================================
      InventoryHistory,

      // ============================================================
      // ORGANISATION
      // ============================================================
      Organisation,
      Employee,
      Location,
    ]),

    AuditModule,
    CdnModule,

    EventEmitterModule.forRoot(),
  ],

  providers: [
    SystemsService,
    AssetsService,
    AssetCategoryService,
    AssetUnitsService,
  ],

  controllers: [
    SystemsController,
    AssetsController,
    AssetCategoryController,
    SoftwareController,
    AssetUnitsController,
  ],

  exports: [
    SystemsService,
    AssetsService,
    AssetCategoryService,
    AssetUnitsService,
  ],
})
export class AssetsModule {}
