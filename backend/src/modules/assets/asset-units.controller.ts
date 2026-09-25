import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

import { AssetUnitsService } from "./asset-units.service";
import { AssetUnitCondition, AssetUnitStatus } from "./models/asset-unit.model";

import {
  CurrentUser,
  AuthUser,
} from "@/common/decorator/current-user.decorator";
// Adjust the CurrentUser import path to match your project.

// ============================================================
// DTOs
// ============================================================

export class ListAssetUnitsQueryDto {
  @IsOptional()
  @IsUUID("4")
  assetId?: string;

  @IsOptional()
  @IsUUID("4")
  organisationId?: string;

  @IsOptional()
  @IsEnum(AssetUnitStatus)
  status?: AssetUnitStatus;

  @IsOptional()
  @IsEnum(AssetUnitCondition)
  condition?: AssetUnitCondition;

  @IsOptional()
  @IsUUID("4")
  locationId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class CreateAssetUnitDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  unitCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  serialNumber?: string;

  @IsOptional()
  @IsEnum(AssetUnitStatus)
  status?: AssetUnitStatus;

  @IsOptional()
  @IsEnum(AssetUnitCondition)
  condition?: AssetUnitCondition;

  @IsOptional()
  @IsUUID("4")
  locationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAssetUnitDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  unitCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  serialNumber?: string | null;

  @IsOptional()
  @IsEnum(AssetUnitStatus)
  status?: AssetUnitStatus;

  @IsOptional()
  @IsEnum(AssetUnitCondition)
  condition?: AssetUnitCondition;

  @IsOptional()
  @IsUUID("4")
  locationId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class AssignAssetUnitDto {
  @IsOptional()
  @IsUUID("4")
  employeeId?: string;

  @IsOptional()
  @IsUUID("4")
  systemId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnAssetUnitDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ChangeUnitStatusDto {
  @IsEnum(AssetUnitStatus)
  status!: AssetUnitStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ChangeUnitConditionDto {
  @IsEnum(AssetUnitCondition)
  condition!: AssetUnitCondition;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ============================================================
// CONTROLLER
// ============================================================

@Controller("asset-units")
export class AssetUnitsController {
  constructor(private readonly assetUnitsService: AssetUnitsService) {}

  // ----------------------------------------------------------
  // LIST
  // GET /asset-units
  // ----------------------------------------------------------

  @Get()
  findAll(@Query() query: ListAssetUnitsQueryDto) {
    return this.assetUnitsService.findAll(query);
  }

  // ----------------------------------------------------------
  // SUMMARY BY ASSET
  // GET /asset-units/summary/:assetId
  // (must be before :id to avoid route clash)
  // ----------------------------------------------------------

  @Get("summary/:assetId")
  summary(@Param("assetId", ParseUUIDPipe) assetId: string) {
    return this.assetUnitsService.summary(assetId);
  }

  // ----------------------------------------------------------
  // FIND ONE
  // GET /asset-units/:id
  // ----------------------------------------------------------

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.assetUnitsService.findOne(id);
  }

  // ----------------------------------------------------------
  // CREATE
  // POST /asset-units/asset/:assetId
  // ----------------------------------------------------------

  @Post("asset/:assetId")
  create(
    @Param("assetId", ParseUUIDPipe) assetId: string,
    @Body() dto: CreateAssetUnitDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.assetUnitsService.create(assetId, dto, actor);
  }

  // ----------------------------------------------------------
  // UPDATE
  // PATCH /asset-units/:id
  // ----------------------------------------------------------

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssetUnitDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.assetUnitsService.update(id, dto, actor);
  }

  // ----------------------------------------------------------
  // ASSIGN
  // POST /asset-units/:id/assign
  // ----------------------------------------------------------

  @Post(":id/assign")
  assign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignAssetUnitDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.assetUnitsService.assign(id, dto, actor);
  }

  // ----------------------------------------------------------
  // RETURN
  // POST /asset-units/:id/return
  // ----------------------------------------------------------

  @Post(":id/return")
  returnUnit(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReturnAssetUnitDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.assetUnitsService.returnUnit(id, actor, dto.notes);
  }

  // ----------------------------------------------------------
  // CHANGE STATUS
  // PATCH /asset-units/:id/status
  // ----------------------------------------------------------

  @Patch(":id/status")
  changeStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeUnitStatusDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.assetUnitsService.changeStatus(
      id,
      dto.status,
      actor,
      dto.notes,
    );
  }

  // ----------------------------------------------------------
  // CHANGE CONDITION
  // PATCH /asset-units/:id/condition
  // ----------------------------------------------------------

  @Patch(":id/condition")
  changeCondition(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeUnitConditionDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.assetUnitsService.changeCondition(
      id,
      dto.condition,
      actor,
      dto.notes,
    );
  }

  // ----------------------------------------------------------
  // DELETE
  // DELETE /asset-units/:id
  // ----------------------------------------------------------

  @Delete(":id")
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.assetUnitsService.remove(id, actor);
  }
}
