import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

// Systems
import { System } from "./models/system.model";
import { SystemSpecs } from "./models/system-specs.model";
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

// Asset History / Assignment / Transfer
import { AssetHistory } from "./models/asset-history.model";
import { AssetAssignment } from "./models/asset-assignment.model";
import { AssetTransfer } from "./models/asset-transfer.model";
import { AssetAssignmentService } from "./asset-assignment.service";
import { AssetAssignmentController } from "./asset-assignment.controller";

// Software
import { SoftwareDetails } from "./models/software-details.model";
import { SoftwareLicense } from "./models/software-license.model";
import { SoftwareLicenseAssignment } from "./models/software-license-assignment.model";
import { SoftwareAssignment } from "./models/software-assignment.model";
import { SoftwareController } from "./software.controller";
import { SoftwareService } from "./software.service";

// Vendor / Inventory
import { Vendor } from "./models/vendor.model";
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
      // System
      System,
      SystemSpecs,

      // Asset
      Asset,
      AssetUnit,
      AssetCategory,
      AssetHistory,
      AssetAssignment,
      AssetTransfer,

      // Software
      SoftwareDetails,
      SoftwareLicense,
      SoftwareLicenseAssignment,
      SoftwareAssignment,

      // Vendor / Inventory
      Vendor,
      InventoryHistory,

      // Organisation
      Organisation,
      Employee,
      Location,
    ]),

    AuditModule,
    CdnModule,

    // EventEmitterModule.forRoot() removed: it must be registered ONCE in
    // AppModule. Calling forRoot() in a feature module creates a second
    // emitter and events stop reaching listeners in other modules.
  ],

  providers: [
    SystemsService,
    AssetsService,
    AssetCategoryService,
    AssetUnitsService,
    AssetAssignmentService,
    SoftwareService,
  ],

  controllers: [
    SystemsController,
    AssetsController,
    AssetCategoryController,
    AssetUnitsController,
    AssetAssignmentController,
    SoftwareController,
  ],

  exports: [
    SystemsService,
    AssetsService,
    AssetCategoryService,
    AssetUnitsService,
    AssetAssignmentService,
    SoftwareService,
  ],
})
export class AssetsModule {}
