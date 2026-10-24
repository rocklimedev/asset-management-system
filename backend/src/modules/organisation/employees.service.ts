import { System } from "../assets/models/system.model";
import { AssetsService } from "../assets/assets.service";
import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Op, WhereOptions } from "sequelize";

import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";

import { AuditService } from "@/modules/audit/audit.service";
import { AuthUser } from "@/common/decorator/current-user.decorator";

import { Employee, EmployeeStatus } from "./models/employees.model";
import { Organisation } from "./models/organisation.model";
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
    private readonly assets: AssetsService,
  ) {}

  // ============================================================
  // GET ALL EMPLOYEES
  // ============================================================

  async findAll(params: {
    search?: string;
    organisationId?: string;
    departmentId?: string;
    status?: string;
    page?: number;
  }) {
    const take = 24;
    const page = Math.max(Number(params.page) || 1, 1);

    const andConditions: WhereOptions<Employee>[] = [];

    // ------------------------------------------------------------
    // SEARCH
    // ------------------------------------------------------------

    if (params.search?.trim()) {
      const search = params.search.trim();

      const like = {
        [Op.like]: `%${search}%`,
      };

      andConditions.push({
        [Op.or]: [{ name: like }, { email: like }, { employeeCode: like }],
      } as WhereOptions<Employee>);
    }

    // ------------------------------------------------------------
    // ORGANISATION
    // ------------------------------------------------------------

    if (params.organisationId?.trim()) {
      andConditions.push({
        organisationId: params.organisationId.trim(),
      } as WhereOptions<Employee>);
    }

    // ------------------------------------------------------------
    // DEPARTMENT
    // ------------------------------------------------------------

    if (params.departmentId?.trim()) {
      andConditions.push({
        departmentId: params.departmentId.trim(),
      } as WhereOptions<Employee>);
    }

    // ------------------------------------------------------------
    // STATUS
    // ------------------------------------------------------------

    if (params.status?.trim()) {
      andConditions.push({
        status: params.status.trim() as EmployeeStatus,
      } as WhereOptions<Employee>);
    }

    // ------------------------------------------------------------
    // FINAL WHERE
    // ------------------------------------------------------------

    const where: WhereOptions<Employee> =
      andConditions.length > 0
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
          // SYSTEMS
          // ------------------------------------------------------

          {
            model: System,

            include: [
              { model: AssetCategory, as: "category", required: false },
              {
                model: AssetAssignment,
                where: {
                  status: AssignmentStatus.ACTIVE,
                },
                required: false,
                include: [Asset],
              },
            ],
          },

          // ------------------------------------------------------
          // ORGANISATION
          // ------------------------------------------------------

          {
            model: Organisation,
            as: "organisation",
          },

          // ------------------------------------------------------
          // DEPARTMENT
          // ------------------------------------------------------

          {
            model: Department,
            as: "department",
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
      });

    return {
      items,
      total,
      page,
      pageSize: take,
      totalPages: Math.ceil(total / take),
    };
  }

  // ============================================================
  // GET SINGLE EMPLOYEE
  // ============================================================

  async findOne(id: string) {
    const employee = await this.employeeModel.findByPk(id, {
      include: [
        // --------------------------------------------------------
        // SYSTEMS
        // --------------------------------------------------------

        {
          model: System,

          include: [
              { model: AssetCategory, as: "category", required: false },
            {
              model: AssetAssignment,
              where: {
                status: AssignmentStatus.ACTIVE,
              },
              required: false,
              include: [Asset],
            },
          ],
        },

        // --------------------------------------------------------
        // ORGANISATION
        // --------------------------------------------------------

        {
          model: Organisation,
          as: "organisation",
        },

        // --------------------------------------------------------
        // DEPARTMENT
        // --------------------------------------------------------

        {
          model: Department,
          as: "department",
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

    if (dto.status === EmployeeStatus.EXITED) {
      await this.releaseCustody(id, actor);
    }

    return this.findOne(id);
  }

  // ============================================================
  // RELEASE ASSETS
  // ============================================================

  private async releaseCustody(id: string, actor: AuthUser) {
    await this.assets.releaseAssetsForExitedEmployee(id, actor);
  }

  // ============================================================
  // REMOVE / EXIT EMPLOYEE
  // ============================================================

  // Keep the record for historical references while removing it from active queries.
  async deleteRecord(id: string, actor: AuthUser) {
    return this.employeeModel.sequelize!.transaction(async transaction => {
      const employee = await this.employeeModel.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!employee) throw new NotFoundException("Employee not found.");
      const assignments = await AssetAssignment.count({ where: { employeeId: id, status: AssignmentStatus.ACTIVE }, transaction });
      const systems = await System.count({ where: { employeeId: id }, transaction });
      if (assignments || systems) {
        throw new ConflictException("Return all assigned assets and computers before deleting this employee. Use Mark as exited to return their assets.");
      }
      await employee.update({ status: EmployeeStatus.EXITED }, { transaction });
      await employee.destroy({ transaction });
      await this.audit.log({ userId: actor.id, action: "EMPLOYEE_DELETED", entity: "Employee", entityId: id,
        metadata: { name: employee.name, employeeCode: employee.employeeCode } }, transaction);
      return { success: true };
    });
  }

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

    await this.releaseCustody(id, actor);

    return {
      success: true,
    };
  }
}
