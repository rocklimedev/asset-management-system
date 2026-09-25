import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/sequelize";
import { Sequelize } from "sequelize-typescript";
import { Op, UniqueConstraintError } from "sequelize";

import { System } from "./models/system.model";
import { SystemSpecs } from "./models/system-specs.model";

import {
  AssetAssignment,
  AssignmentStatus,
} from "./models/asset-assignment.model";

import { Asset } from "./models/asset.model";
import { AssetCategory } from "./models/asset-category.model";
import { AssetHistory } from "./models/asset-history.model";

import {
  Employee,
  EmployeeStatus,
} from "../organisation/models/employees.model";

import { Organisation } from "../organisation/models/organisation.model";

import { AuditService } from "../audit/audit.service";
import { AuthUser } from "@/common/decorator/current-user.decorator";

import { CreateSystemDto, UpdateSystemDto } from "./dto/system.dto";

@Injectable()
export class SystemsService {
  constructor(
    @InjectConnection() private readonly db: Sequelize,
    private readonly audit: AuditService,
  ) {}

  // ============================================================
  // COMMON INCLUDE
  // ============================================================

  private get include() {
    return [
      // Organisation
      {
        model: Organisation,
        required: false,
      },

      // Employee
      {
        model: Employee,
        required: false,
      },

      // System specs
      {
        model: SystemSpecs,
        as: "specs",
        required: false,
      },

      // Active asset assignments
      {
        model: AssetAssignment,
        where: {
          status: AssignmentStatus.ACTIVE,
        },
        required: false,
        include: [
          {
            model: Asset,
            include: [AssetCategory],
          },
        ],
      },
    ];
  }

  // ============================================================
  // LIST SYSTEMS
  // ============================================================

  list(search?: string, employeeId?: string, organisationId?: string) {
    return System.findAll({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(organisationId ? { organisationId } : {}),

        ...(search?.trim()
          ? {
              [Op.or]: [
                {
                  name: {
                    [Op.like]: `%${search.trim()}%`,
                  },
                },
                {
                  systemTag: {
                    [Op.like]: `%${search.trim()}%`,
                  },
                },
              ],
            }
          : {}),
      },

      include: this.include,

      order: [["name", "ASC"]],
    });
  }

  // ============================================================
  // GET SYSTEM
  // ============================================================

  async get(id: string) {
    const system = await System.findByPk(id, {
      include: this.include,
    });

    if (!system) {
      throw new NotFoundException("System not found.");
    }

    return system;
  }

  // ============================================================
  // CREATE SYSTEM
  // ============================================================

  async create(dto: CreateSystemDto, actor: AuthUser) {
    try {
      return await this.db.transaction(async (transaction) => {
        // ======================================================
        // VALIDATE ORGANISATION
        // ======================================================

        if (dto.organisationId) {
          const organisation = await Organisation.findByPk(dto.organisationId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

          if (!organisation) {
            throw new NotFoundException("Organisation not found.");
          }

          if (!organisation.isActive) {
            throw new BadRequestException(
              "System cannot be assigned to an inactive organisation.",
            );
          }
        }

        // ======================================================
        // CREATE SYSTEM
        // ======================================================

        const system = await System.create(
          {
            ...dto,
            employeeId: null,
          } as System,
          {
            transaction,
          },
        );

        // ======================================================
        // AUDIT
        // ======================================================

        await this.audit.log(
          {
            userId: actor.id,
            action: "SYSTEM_CREATED",
            entity: "System",
            entityId: system.id,
            metadata: {
              ...dto,
            },
          },
          transaction,
        );

        // ======================================================
        // RETURN
        // ======================================================

        return System.findByPk(system.id, {
          include: this.include,
          transaction,
        });
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException("System tag already exists.");
      }

      throw error;
    }
  }

  // ============================================================
  // UPDATE SYSTEM
  // ============================================================

  async update(id: string, dto: UpdateSystemDto, actor: AuthUser) {
    if (dto.name === null || dto.systemTag === null) {
      throw new BadRequestException("Name and system tag cannot be null.");
    }

    try {
      return await this.db.transaction(async (transaction) => {
        // ======================================================
        // GET SYSTEM
        // ======================================================

        const system = await System.findByPk(id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });

        if (!system) {
          throw new NotFoundException("System not found.");
        }

        // ======================================================
        // ORGANISATION CHANGE
        // ======================================================

        if (
          dto.organisationId !== undefined &&
          dto.organisationId !== system.organisationId
        ) {
          // ----------------------------------------------------
          // New organisation supplied
          // ----------------------------------------------------

          if (dto.organisationId) {
            const organisation = await Organisation.findByPk(
              dto.organisationId,
              {
                transaction,
                lock: transaction.LOCK.UPDATE,
              },
            );

            if (!organisation) {
              throw new NotFoundException("Organisation not found.");
            }

            if (!organisation.isActive) {
              throw new BadRequestException(
                "System cannot be assigned to an inactive organisation.",
              );
            }

            // --------------------------------------------------
            // Existing employee must belong to new organisation
            // --------------------------------------------------

            if (system.employeeId) {
              const employee = await Employee.findByPk(system.employeeId, {
                transaction,
                lock: transaction.LOCK.UPDATE,
              });

              if (!employee) {
                throw new NotFoundException(
                  "Currently assigned employee not found.",
                );
              }

              if (employee.organisationId !== dto.organisationId) {
                throw new BadRequestException(
                  "System cannot be moved to another organisation while it is assigned to an employee from a different organisation. Return the system first or assign it to an employee from the new organisation.",
                );
              }
            }
          }

          // ----------------------------------------------------
          // Removing organisation
          // ----------------------------------------------------

          if (!dto.organisationId && system.employeeId) {
            throw new BadRequestException(
              "Return the system before removing its organisation.",
            );
          }
        }

        // ======================================================
        // UPDATE
        // ======================================================

        await system.update(dto, {
          transaction,
        });

        // ======================================================
        // AUDIT
        // ======================================================

        await this.audit.log(
          {
            userId: actor.id,
            action: "SYSTEM_UPDATED",
            entity: "System",
            entityId: id,
            metadata: {
              ...dto,
            },
          },
          transaction,
        );

        // ======================================================
        // RETURN
        // ======================================================

        return System.findByPk(id, {
          include: this.include,
          transaction,
        });
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException("System tag already exists.");
      }

      throw error;
    }
  }

  // ============================================================
  // DELETE SYSTEM
  // ============================================================

  async delete(id: string, actor: AuthUser) {
    return this.db.transaction(async (transaction) => {
      const system = await System.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!system) {
        throw new NotFoundException("System not found.");
      }

      // ========================================================
      // CHECK ACTIVE COMPONENTS
      // ========================================================

      const activeAssignments = await AssetAssignment.count({
        where: {
          systemId: id,
          status: AssignmentStatus.ACTIVE,
        },
        transaction,
      });

      if (activeAssignments > 0) {
        throw new BadRequestException(
          `Cannot delete system while it has ${activeAssignments} active component${
            activeAssignments === 1 ? "" : "s"
          }. Remove all components from the system first.`,
        );
      }

      // ========================================================
      // DELETE SYSTEM SPECS
      // ========================================================

      await SystemSpecs.destroy({
        where: {
          systemId: id,
        },
        transaction,
      });

      // ========================================================
      // AUDIT
      // ========================================================

      await this.audit.log(
        {
          userId: actor.id,
          action: "SYSTEM_DELETED",
          entity: "System",
          entityId: id,
          metadata: {
            systemTag: system.systemTag,
            name: system.name,
            employeeId: system.employeeId,
            organisationId: system.organisationId,
          },
        },
        transaction,
      );

      // ========================================================
      // DELETE SYSTEM
      // ========================================================

      await system.destroy({
        transaction,
      });

      return {
        success: true,
        message: "System deleted successfully.",
        id,
      };
    });
  }

  // ============================================================
  // SET EMPLOYEE
  // ============================================================

  async setEmployee(id: string, employeeId: string | null, actor: AuthUser) {
    return this.db.transaction(async (transaction) => {
      // ========================================================
      // GET SYSTEM
      // ========================================================

      const system = await System.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!system) {
        throw new NotFoundException("System not found.");
      }

      // ========================================================
      // GET EMPLOYEE
      // ========================================================

      const employee = employeeId
        ? await Employee.findByPk(employeeId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
        : null;

      if (employeeId && !employee) {
        throw new NotFoundException("Employee not found.");
      }

      // ========================================================
      // EMPLOYEE STATUS
      // ========================================================

      if (
        employee &&
        ![EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE].includes(
          employee.status,
        )
      ) {
        throw new BadRequestException(
          "Systems can only be assigned to active employees or employees on leave.",
        );
      }

      // ========================================================
      // ORGANISATION VALIDATION
      // ========================================================

      if (
        employee &&
        system.organisationId &&
        employee.organisationId !== system.organisationId
      ) {
        throw new BadRequestException(
          "System can only be assigned to an employee from the same organisation.",
        );
      }

      // ========================================================
      // SAME ASSIGNMENT
      // ========================================================

      if (system.employeeId === employeeId) {
        throw new BadRequestException("System already has this assignment.");
      }

      // ========================================================
      // PREVIOUS EMPLOYEE
      // ========================================================

      const previous = system.employeeId
        ? await Employee.findByPk(system.employeeId, {
            transaction,
          })
        : null;

      const fromEmployeeId = system.employeeId;

      // ========================================================
      // UPDATE SYSTEM
      // ========================================================

      await system.update(
        {
          employeeId,
        },
        {
          transaction,
        },
      );

      // ========================================================
      // UPDATE ASSET HISTORY
      // ========================================================

      const components = await AssetAssignment.findAll({
        where: {
          systemId: id,
          status: AssignmentStatus.ACTIVE,
        },
        transaction,
      });

      for (const component of components) {
        await AssetHistory.create(
          {
            assetId: component.assetId,
            action: "SYSTEM_CUSTODY_CHANGED",
            performedBy: actor.name,
            fromValue: previous?.name ?? "Unassigned system",
            toValue: employee?.name ?? "Unassigned system",
            notes: `System: ${system.systemTag}`,
          } as AssetHistory,
          {
            transaction,
          },
        );
      }

      // ========================================================
      // AUDIT
      // ========================================================

      await this.audit.log(
        {
          userId: actor.id,
          action: employeeId ? "SYSTEM_ASSIGNED" : "SYSTEM_RETURNED",
          entity: "System",
          entityId: id,
          metadata: {
            fromEmployeeId,
            employeeId,
            organisationId: system.organisationId,
            systemTag: system.systemTag,
          },
        },
        transaction,
      );

      // ========================================================
      // RETURN UPDATED SYSTEM
      // ========================================================

      return System.findByPk(id, {
        include: this.include,
        transaction,
      });
    });
  }

  // ============================================================
  // GET SYSTEM SPECS
  // ============================================================

  async getSpecs(id: string) {
    const system = await System.findByPk(id);

    if (!system) {
      throw new NotFoundException("System not found.");
    }

    const specs = await SystemSpecs.findOne({
      where: {
        systemId: id,
      },
    });

    return specs;
  }

  // ============================================================
  // CREATE / UPDATE SYSTEM SPECS
  // ============================================================

  async upsertSpecs(
    id: string,
    specsDto: Partial<SystemSpecs>,
    actor: AuthUser,
  ) {
    return this.db.transaction(async (transaction) => {
      // ========================================================
      // GET SYSTEM
      // ========================================================

      const system = await System.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!system) {
        throw new NotFoundException("System not found.");
      }

      // ========================================================
      // GET EXISTING SPECS
      // ========================================================

      let specs = await SystemSpecs.findOne({
        where: {
          systemId: id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      // ========================================================
      // UPDATE / CREATE
      // ========================================================

      if (specs) {
        await specs.update(specsDto, {
          transaction,
        });
      } else {
        specs = await SystemSpecs.create(
          {
            ...specsDto,
            systemId: id,
          } as SystemSpecs,
          {
            transaction,
          },
        );
      }

      // ========================================================
      // AUDIT
      // ========================================================

      await this.audit.log(
        {
          userId: actor.id,
          action: "SYSTEM_SPECS_UPDATED",
          entity: "SystemSpecs",
          entityId: specs.id,
          metadata: {
            systemId: id,
            systemTag: system.systemTag,
          },
        },
        transaction,
      );

      return specs;
    });
  }
}
