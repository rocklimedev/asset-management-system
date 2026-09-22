import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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

@Controller("systems")
export class SystemsController {
  constructor(private readonly service: SystemsService) {}
  @Get()
  list(
    @Query("search") search?: string,
    @Query("employeeId") employeeId?: string,
  ) {
    return this.service.list(search, employeeId);
  }
  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }
  @Post()
  create(@Body() dto: CreateSystemDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor);
  }
  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateSystemDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.update(id, dto, actor);
  }
  @Post(":id/assign")
  assign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignSystemDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.setEmployee(id, dto.employeeId, actor);
  }
  @Post(":id/return")
  release(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.service.setEmployee(id, null, actor);
  }
}
