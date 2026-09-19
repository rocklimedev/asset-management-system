import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { ReportsService } from "./reports.service";
import { ReportsController } from "./reports.controller";

import { Asset } from "../assets/models/asset.model";
import { AssetCategory } from "../assets/models/asset-category.model";
import { AssetAssignment } from "../assets/models/asset-assignment.model";
import { Vendor } from "../assets/models/vendor.model";

import { Location } from "@/modules/organisation/models/location.model";
import { Employee } from "@/modules/organisation/models/employees.model";

@Module({
  imports: [
    SequelizeModule.forFeature([
      Asset,
      AssetCategory,
      AssetAssignment,
      Vendor,
      Location,
      Employee,
    ]),
  ],

  providers: [ReportsService],

  controllers: [ReportsController],

  exports: [ReportsService],
})
export class ReportsModule {}
