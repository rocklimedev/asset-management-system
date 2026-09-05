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

import { EmployeesService } from "./employees.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";

import { RequirePermissions } from "@/common/decorator/roles.decorator";
import {
  CurrentUser,
  AuthUser,
} from "@/common/decorator/current-user.decorator";

@Controller("employees")
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  // ============================================================
  // GET ALL EMPLOYEES
  // ============================================================

  @Get()
  findAll(
    @Query("search") search?: string,
    @Query("departmentId") departmentId?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
  ) {
    return this.service.findAll({
      search,

      // UUID - do NOT convert to Number()
      departmentId: departmentId || undefined,

      status,

      // Pagination is still numeric
      page: page ? Number(page) : undefined,
    });
  }

  // ============================================================
  // GET SINGLE EMPLOYEE
  // ============================================================

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  // ============================================================
  // CREATE EMPLOYEE
  // ============================================================

  @Post()
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  // ============================================================
  // UPDATE EMPLOYEE
  // ============================================================

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  // ============================================================
  // REMOVE / EXIT EMPLOYEE
  // ============================================================

  @Delete(":id")
  remove(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
