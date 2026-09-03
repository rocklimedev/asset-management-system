import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { AssetsService } from "./assets.service";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { AssignAssetDto } from "./dto/assign-asset.dto";
import { TransferAssetDto } from "./dto/transfer-asset.dto";
import { RequirePermissions } from "../../common/decorator/roles.decorator";
import {
  CurrentUser,
  AuthUser,
} from "../../common/decorator/current-user.decorator";

@Controller("assets")
export class AssetsController {
  constructor(private service: AssetsService) {}

  @Get()
  @RequirePermissions("asset.view")
  findAll(@Query() query: Record<string, string>) {
    return this.service.findAll({
      search: query.search,
      kind: query.kind,
      status: query.status,
      condition: query.condition,
      categoryId: query.categoryId ? Number(query.categoryId) : undefined,
      locationId: query.locationId ? Number(query.locationId) : undefined,
      assigned: query.assigned as any,
      sortBy: query.sortBy as any,
      sortDir: query.sortDir as any,
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
  }

  @Get(":id")
  @RequirePermissions("asset.view")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Get(":id/history")
  @RequirePermissions("asset.history.view")
  history(@Param("id", ParseIntPipe) id: number) {
    return this.service.history(id);
  }

  @Post()
  @RequirePermissions("asset.create")
  create(@Body() dto: CreateAssetDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(":id")
  @RequirePermissions("asset.edit")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAssetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Post(":id/assign")
  @RequirePermissions("asset.transfer")
  assign(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: AssignAssetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.assign(id, dto, user);
  }

  // The single endpoint both the drag-and-drop UI and the "Actions -> Transfer" fallback call.
  @Post(":id/transfer")
  @RequirePermissions("asset.transfer")
  transfer(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: TransferAssetDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.transfer(id, dto, user);
  }

  @Post(":id/return")
  @RequirePermissions("asset.transfer")
  returnAsset(
    @Param("id", ParseIntPipe) id: number,
    @Body("notes") notes: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.returnAsset(id, user, notes);
  }
}
