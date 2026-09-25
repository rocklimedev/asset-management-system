import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";

import {
  CurrentUser,
  AuthUser,
} from "@/common/decorator/current-user.decorator";

import { SystemsService } from "./systems.service";

import {
  CreateSystemDto,
  UpdateSystemDto,
  AssignSystemDto,
} from "./dto/system.dto";

import { UpsertSystemSpecsDto } from "./dto/system-sepcs.dto";

@Controller("systems")
export class SystemsController {
  constructor(private readonly service: SystemsService) {}

  // ============================================================
  // LIST
  // ============================================================

  @Get()
  list(
    @Query("search") search?: string,
    @Query("employeeId") employeeId?: string,
    @Query("organisationId") organisationId?: string,
  ) {
    return this.service.list(search, employeeId, organisationId);
  }

  // ============================================================
  // GET SYSTEM
  // ============================================================

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  // ============================================================
  // CREATE SYSTEM
  // ============================================================

  @Post()
  create(@Body() dto: CreateSystemDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor);
  }

  // ============================================================
  // UPDATE SYSTEM
  // ============================================================

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSystemDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor);
  }

  // ============================================================
  // DELETE SYSTEM
  // ============================================================

  @Delete(":id")
  delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.delete(id, actor);
  }

  // ============================================================
  // ASSIGN SYSTEM
  // ============================================================

  @Post(":id/assign")
  assign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignSystemDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.setEmployee(id, dto.employeeId, actor);
  }

  // ============================================================
  // RETURN SYSTEM
  // ============================================================

  @Post(":id/return")
  release(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.setEmployee(id, null, actor);
  }

  // ============================================================
  // GET SYSTEM SPECS
  // ============================================================

  @Get(":id/specs")
  getSpecs(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.getSpecs(id);
  }

  // ============================================================
  // CREATE / UPDATE SYSTEM SPECS
  // ============================================================

  @Put(":id/specs")
  upsertSpecs(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpsertSystemSpecsDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.upsertSpecs(id, dto, actor);
  }
}
