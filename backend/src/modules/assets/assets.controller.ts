import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";

import { AssetsService } from "./assets.service";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { AssignAssetDto } from "./dto/assign-asset.dto";
import { TransferAssetDto } from "./dto/transfer-asset.dto";

import { RequirePermissions } from "@/common/decorator/roles.decorator";
import {
  CurrentUser,
  AuthUser,
} from "@/common/decorator/current-user.decorator";

@Controller("assets")
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  // ============================================================
  // GET ALL ASSETS
  // ============================================================

  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.service.findAll({
      search: query.search,
      organisationId: query.organisationId,
      kind: query.kind,
      status: query.status,
      condition: query.condition,

      // UUIDs must remain strings
      categoryId: query.categoryId || undefined,
      locationId: query.locationId || undefined,

      assigned: query.assigned as any,
      sortBy: query.sortBy as any,
      sortDir: query.sortDir as any,

      // These are still numeric pagination values
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  }

  // ============================================================
  // GET SINGLE ASSET
  // ============================================================

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  // ============================================================
  // GET ASSET HISTORY
  // ============================================================

  @Get(":id/history")
  history(@Param("id") id: string) {
    return this.service.history(id);
  }

  // ============================================================
  // CREATE ASSET
  // ============================================================

  @Post()
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  // ============================================================
  // UPDATE ASSET
  // ============================================================

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  // ============================================================
  // ASSIGN ASSET
  // ============================================================

  @Post(":id/assign")
  assign(
    @Param("id") id: string,
    @Body() dto: AssignAssetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.assign(id, dto, user);
  }

  // ============================================================
  // TRANSFER ASSET
  // ============================================================

  @Post(":id/transfer")
  transfer(
    @Param("id") id: string,
    @Body() dto: TransferAssetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.transfer(id, dto, user);
  }

  // ============================================================
  // RETURN ASSET
  // ============================================================

  @Post(":id/return")
  returnAsset(
    @Param("id") id: string,
    @Body("notes") notes: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.returnAsset(id, user, notes);
  }
}
