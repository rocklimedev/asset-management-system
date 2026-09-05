import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { AssetsService } from "./assets.service";
import { AssetsController } from "./assets.controller";

import { AssetCategoryService } from "./asset-category.service";
import { AssetCategoryController } from "./asset-category.controller";

import { SoftwareController } from "./software.controller";

import { AuditModule } from "@/modules/audit/audit.module";

import { Asset } from "./models/asset.model";
import { AssetCategory } from "./models/asset-category.model";
import { AssetHistory } from "./models/asset-history.model";
import { AssetAssignment } from "./models/asset-assignment.model";
import { AssetTransfer } from "./models/asset-transfer.model";
import { SoftwareLicense } from "./models/software-license.model";
import { Vendor } from "./models/vendor.model";

import { Organisation } from "@/modules/organisation/models/organisation.model";
import { Employee } from "@/modules/organisation/models/employees.model";
import { Location } from "@/modules/organisation/models/location.model";

@Module({
  imports: [
    SequelizeModule.forFeature([
      Asset,
      AssetCategory,
      AssetHistory,
      AssetAssignment,
      AssetTransfer,
      SoftwareLicense,
      Vendor,
      Organisation,
      Employee,
      Location,
    ]),

    AuditModule,
  ],

  providers: [AssetsService, AssetCategoryService],

  controllers: [AssetsController, AssetCategoryController, SoftwareController],

  exports: [AssetsService, AssetCategoryService],
})
export class AssetsModule {}
