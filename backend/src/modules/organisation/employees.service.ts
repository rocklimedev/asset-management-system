import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, WhereOptions } from "sequelize";

import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../../common/decorator/current-user.decorator";

import { Employee, EmployeeStatus } from "./models/employees.model";
import { Department } from "./models/department.model";
import { Location } from "./models/location.model";

import {
  AssetAssignment,
  AssignmentStatus,
} from "../assets/models/asset-assignment.model";
import { Asset } from "../assets/models/asset.model";
import { AssetCategory } from "../assets/models/asset-category.model";
import { SoftwareLicense } from "../assets/models/software-license.model";

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee)
    private readonly employeeModel: typeof Employee,

    private readonly audit: AuditService,
  ) {}

  async findAll(params: {
    search?: string;
    departmentId?: number;
    status?: string;
    page?: number;
  }) {
    const take = 24;
    const page = params.page ?? 1;

    const andConditions: WhereOptions<Employee>[] = [];

    if (params.search) {
      const like = { [Op.like]: `%${params.search}%` };
      andConditions.push({
        [Op.or]: [{ name: like }, { email: like }, { employeeCode: like }],
      } as WhereOptions<Employee>);
    }

    if (params.departmentId) {
      andConditions.push({ departmentId: params.departmentId });
    }

    if (params.status) {
      andConditions.push({ status: params.status as EmployeeStatus });
    }

    const where: WhereOptions<Employee> = andConditions.length
      ? { [Op.and]: andConditions }
      : {};

    const { rows: items, count: total } =
      await this.employeeModel.findAndCountAll({
        where,
        include: [
          { model: Department, as: "department" },
          { model: Location, as: "location" },
          {
            model: AssetAssignment,
            as: "assignments",
            where: { status: AssignmentStatus.ACTIVE },
            required: false,
            include: [
              {
                model: Asset,
                as: "asset",
                include: [{ model: AssetCategory, as: "category" }],
              },
            ],
          },
        ],
        order: [["name", "ASC"]],
        limit: take,
        offset: (page - 1) * take,
        distinct: true,
        subQuery: false,
      });

    return { items, total, page, pageSize: take };
  }

  async findOne(id: number) {
    const employee = await this.employeeModel.findByPk(id, {
      include: [
        { model: Department, as: "department" },
        { model: Location, as: "location" },
        { model: Employee, as: "manager" },
        {
          model: AssetAssignment,
          as: "assignments",
          where: { status: AssignmentStatus.ACTIVE },
          required: false,
          include: [
            {
              model: Asset,
              as: "asset",
              include: [
                { model: AssetCategory, as: "category" },
                { model: SoftwareLicense, as: "license" },
              ],
            },
          ],
        },
      ],
    });

    if (!employee) {
      throw new NotFoundException("Employee not found.");
    }

    return employee;
  }

  async create(dto: CreateEmployeeDto, actor: AuthUser) {
    const employee = await this.employeeModel.create({
      ...dto,
      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
    } as Employee);

    await this.audit.log({
      userId: actor.id,
      action: "EMPLOYEE_CREATED",
      entity: "Employee",
      entityId: employee.id,
    });

    return employee;
  }

  async update(id: number, dto: UpdateEmployeeDto, actor: AuthUser) {
    const existing = await this.findOne(id);

    const employee = await existing.update({
      ...dto,
      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
    });

    await this.audit.log({
      userId: actor.id,
      action: "EMPLOYEE_EDITED",
      entity: "Employee",
      entityId: employee.id,
      metadata: dto as unknown as Record<string, unknown>,
    });

    return employee;
  }

  async remove(id: number, actor: AuthUser) {
    const existing = await this.findOne(id);

    await existing.update({ status: EmployeeStatus.EXITED });

    await this.audit.log({
      userId: actor.id,
      action: "EMPLOYEE_EXITED",
      entity: "Employee",
      entityId: id,
    });

    return { success: true };
  }
}
