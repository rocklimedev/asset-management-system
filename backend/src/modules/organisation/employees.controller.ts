import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { EmployeesService } from "./employees.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { RequirePermissions } from "../../common/decorator/roles.decorator";
import {
  CurrentUser,
  AuthUser,
} from "../../common/decorator/current-user.decorator";

@Controller("employees")
export class EmployeesController {
  constructor(private service: EmployeesService) {}

  @Get()
  @RequirePermissions("employee.view")
  findAll(
    @Query("search") search?: string,
    @Query("departmentId") departmentId?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
  ) {
    return this.service.findAll({
      search,
      departmentId: departmentId ? Number(departmentId) : undefined,
      status,
      page: page ? Number(page) : undefined,
    });
  }

  @Get(":id")
  @RequirePermissions("employee.view")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions("employee.manage")
  create(@Body() dto: CreateEmployeeDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(":id")
  @RequirePermissions("employee.manage")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(":id")
  @RequirePermissions("employee.manage")
  remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
