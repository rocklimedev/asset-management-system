import { Module } from "@nestjs/common";
import { SequelizeModule } from "@nestjs/sequelize";

import { CategoriesController } from "./categories.controller";
import { CategoriesService } from "./categories.service";

import { Category } from "./category.model";
import { Organisation } from "../organisations/organisation.model";

@Module({
  imports: [SequelizeModule.forFeature([Category, Organisation])],

  controllers: [CategoriesController],

  providers: [CategoriesService],

  exports: [CategoriesService, SequelizeModule],
})
export class CategoriesModule {}
