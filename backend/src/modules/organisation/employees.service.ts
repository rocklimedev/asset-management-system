import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, WhereOptions } from "sequelize";

import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";

import { AuditService } from "@/modules/audit/audit.service";
import { AuthUser } from "@/common/decorator/current-user.decorator";

import { Employee, EmployeeStatus } from "./models/employees.model";
import { Department } from "./models/department.model";
import { Location } from "./models/location.model";

import {
  AssetAssignment,
  AssignmentStatus,
} from "@/modules/assets/models/asset-assignment.model";

import { Asset } from "@/modules/assets/models/asset.model";
import { AssetCategory } from "@/modules/assets/models/asset-category.model";
import { SoftwareLicense } from "@/modules/assets/models/software-license.model";

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee)
    private readonly employeeModel: typeof Employee,

    private readonly audit: AuditService,
  ) {}

  // ============================================================
  // GET ALL EMPLOYEES
  // ============================================================

  async findAll(params: {
    search?: string;
    departmentId?: string;
    status?: string;
    page?: number;
  }) {
    const take = 24;
    const page = params.page ?? 1;

    const andConditions: WhereOptions<Employee>[] = [];

    // ------------------------------------------------------------
    // SEARCH
    // ------------------------------------------------------------

    if (params.search) {
      const like = {
        [Op.like]: `%${params.search}%`,
      };

      andConditions.push({
        [Op.or]: [{ name: like }, { email: like }, { employeeCode: like }],
      } as WhereOptions<Employee>);
    }

    // ------------------------------------------------------------
    // DEPARTMENT
    // ------------------------------------------------------------

    if (params.departmentId) {
      andConditions.push({
        departmentId: params.departmentId,
      });
    }

    // ------------------------------------------------------------
    // STATUS
    // ------------------------------------------------------------

    if (params.status) {
      andConditions.push({
        status: params.status as EmployeeStatus,
      });
    }

    const where: WhereOptions<Employee> = andConditions.length
      ? {
          [Op.and]: andConditions,
        }
      : {};

    // ============================================================
    // QUERY
    // ============================================================

    const { rows: items, count: total } =
      await this.employeeModel.findAndCountAll({
        where,

        include: [
          // ------------------------------------------------------
          // DEPARTMENT
          // ------------------------------------------------------

          {
            model: Department,
            as: "departments",
          },

          // ------------------------------------------------------
          // LOCATION
          // ------------------------------------------------------

          {
            model: Location,
            as: "location",
          },

          // ------------------------------------------------------
          // ACTIVE ASSET ASSIGNMENTS
          // ------------------------------------------------------

          {
            model: AssetAssignment,
            as: "assignments",

            where: {
              status: AssignmentStatus.ACTIVE,
            },

            required: false,

            include: [
              {
                model: Asset,
                as: "asset",

                include: [
                  {
                    model: AssetCategory,
                    as: "category",
                  },
                ],
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

    return {
      items,
      total,
      page,
      pageSize: take,
    };
  }

  // ============================================================
  // GET SINGLE EMPLOYEE
  // ============================================================

  async findOne(id: string) {
    const employee = await this.employeeModel.findByPk(id, {
      include: [
        // --------------------------------------------------------
        // DEPARTMENT
        // --------------------------------------------------------

        {
          model: Department,
          as: "departments",
        },

        // --------------------------------------------------------
        // LOCATION
        // --------------------------------------------------------

        {
          model: Location,
          as: "location",
        },

        // --------------------------------------------------------
        // MANAGER
        // --------------------------------------------------------

        {
          model: Employee,
          as: "manager",
        },

        // --------------------------------------------------------
        // ACTIVE ASSET ASSIGNMENTS
        // --------------------------------------------------------

        {
          model: AssetAssignment,
          as: "assignments",

          where: {
            status: AssignmentStatus.ACTIVE,
          },

          required: false,

          include: [
            {
              model: Asset,
              as: "asset",

              include: [
                {
                  model: AssetCategory,
                  as: "category",
                },
                {
                  model: SoftwareLicense,
                  as: "license",
                },
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

  // ============================================================
  // CREATE EMPLOYEE
  // ============================================================

  async create(dto: CreateEmployeeDto, actor: AuthUser) {
    const employee = await this.employeeModel.create({
      ...dto,

      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
    } as Employee);

    // ------------------------------------------------------------
    // AUDIT
    // ------------------------------------------------------------

    await this.audit.log({
      userId: actor.id,
      action: "EMPLOYEE_CREATED",
      entity: "Employee",
      entityId: employee.id,
    });

    return employee;
  }

  // ============================================================
  // UPDATE EMPLOYEE
  // ============================================================

  async update(id: string, dto: UpdateEmployeeDto, actor: AuthUser) {
    const existing = await this.findOne(id);

    const employee = await existing.update({
      ...dto,

      joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : null,
    });

    // ------------------------------------------------------------
    // AUDIT
    // ------------------------------------------------------------

    await this.audit.log({
      userId: actor.id,
      action: "EMPLOYEE_EDITED",
      entity: "Employee",
      entityId: employee.id,
      metadata: dto as unknown as Record<string, unknown>,
    });

    return employee;
  }

  // ============================================================
  // REMOVE / EXIT EMPLOYEE
  // ============================================================

  async remove(id: string, actor: AuthUser) {
    const existing = await this.findOne(id);

    await existing.update({
      status: EmployeeStatus.EXITED,
    });

    // ------------------------------------------------------------
    // AUDIT
    // ------------------------------------------------------------

    await this.audit.log({
      userId: actor.id,
      action: "EMPLOYEE_EXITED",
      entity: "Employee",
      entityId: id,
    });

    return {
      success: true,
    };
  }
}
