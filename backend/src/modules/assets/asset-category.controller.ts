import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { AssetCategoryService } from "./asset-category.service";
import { AssetKind } from "./models/asset-category.model";

@Controller("asset-categories")
export class AssetCategoryController {
  constructor(private readonly assetCategoryService: AssetCategoryService) {}

  // ============================================================
  // CREATE
  // POST /asset-categories
  // ============================================================

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      description?: string | null;
      type: AssetKind;
      organisationId?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.assetCategoryService.create(body);
  }

  // ============================================================
  // GET ALL
  // GET /asset-categories
  // ============================================================

  @Get()
  async findAll(
    @Query("organisationId") organisationId?: string,
    @Query("type") type?: AssetKind,
    @Query("isActive") isActive?: string,
  ) {
    let parsedIsActive: boolean | undefined;

    if (isActive === "true") {
      parsedIsActive = true;
    } else if (isActive === "false") {
      parsedIsActive = false;
    }

    return this.assetCategoryService.findAll({
      organisationId,
      type,
      isActive: parsedIsActive,
    });
  }

  // ============================================================
  // GET ONE
  // GET /asset-categories/:id
  // ============================================================

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.assetCategoryService.findOne(id);
  }

  // ============================================================
  // UPDATE
  // PATCH /asset-categories/:id
  // ============================================================

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      description?: string | null;
      type?: AssetKind;
      isActive?: boolean;
    },
  ) {
    return this.assetCategoryService.update(id, body);
  }

  // ============================================================
  // TOGGLE ACTIVE
  // PATCH /asset-categories/:id/toggle-active
  // ============================================================

  @Patch(":id/toggle-active")
  async toggleActive(@Param("id") id: string) {
    return this.assetCategoryService.toggleActive(id);
  }

  // ============================================================
  // DELETE
  // DELETE /asset-categories/:id
  // ============================================================

  @Delete(":id")
  async remove(@Param("id") id: string) {
    return this.assetCategoryService.remove(id);
  }
}
