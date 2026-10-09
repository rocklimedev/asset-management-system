import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";

import { Asset } from "../assets/models/asset.model";
import { AssetCategory } from "../assets/models/asset-category.model";
import { AssetAssignment } from "../assets/models/asset-assignment.model";
import { Vendor } from "../assets/models/vendor.model";
import { System } from "../assets/models/system.model";
import { SystemSpecs } from "../assets/models/system-specs.model";
import { AssetUnit } from "../assets/models/asset-unit.model";

import { Location } from "@/modules/organisation/models/location.model";
import { Employee } from "@/modules/organisation/models/employees.model";
import { Organisation } from "@/modules/organisation/models/organisation.model";

@Module({
  imports: [
    SequelizeModule.forFeature([
      Asset,
      AssetCategory,
      AssetAssignment,
      Vendor,
      Location,
      Employee,
      System,
      SystemSpecs,
      AssetUnit,
      Organisation,
    ]),
  ],

  providers: [ReportsService],

  controllers: [ReportsController],

  exports: [ReportsService],
})
export class ReportsModule {}
