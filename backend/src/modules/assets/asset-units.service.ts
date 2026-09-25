import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { InjectConnection, InjectModel } from "@nestjs/sequelize";
import { Op, Transaction, WhereOptions } from "sequelize";
import { Sequelize } from "sequelize-typescript";

import { Asset, AssetStatus } from "./models/asset.model";
import {
  AssetUnit,
  AssetUnitCondition,
  AssetUnitStatus,
} from "./models/asset-unit.model";

import {
  AssetAssignment,
  AssignmentStatus,
} from "./models/asset-assignment.model";
import { AssetHistory } from "./models/asset-history.model";
import {
  InventoryHistory,
  InventoryChangeType,
} from "./models/inventory-history.model";

import {
  Employee,
  EmployeeStatus,
} from "../organisation/models/employees.model";
import { Location } from "../organisation/models/location.model";
import { System } from "./models/system.model";

import { AuditService } from "@/modules/audit/audit.service";
import { AuthUser } from "@/common/decorator/current-user.decorator";

@Injectable()
export class AssetUnitsService {
  constructor(
    @InjectModel(AssetUnit)
    private readonly assetUnitModel: typeof AssetUnit,

    @InjectModel(Asset)
    private readonly assetModel: typeof Asset,

    @InjectModel(AssetAssignment)
    private readonly assetAssignmentModel: typeof AssetAssignment,

    @InjectModel(AssetHistory)
    private readonly assetHistoryModel: typeof AssetHistory,

    @InjectModel(InventoryHistory)
    private readonly inventoryHistoryModel: typeof InventoryHistory,

    @InjectModel(Employee)
    private readonly employeeModel: typeof Employee,

    @InjectModel(Location)
    private readonly locationModel: typeof Location,

    @InjectConnection()
    private readonly sequelize: Sequelize,

    private readonly audit: AuditService,
  ) {}

  // ============================================================
  // COMMON INCLUDE
  // ============================================================

  private get unitInclude() {
    return [
      {
        model: Asset,
        as: "asset",
      },
      {
        model: Location,
        as: "location",
      },
      {
        model: AssetAssignment,
        as: "assignments",
        required: false,
        where: {
          status: AssignmentStatus.ACTIVE,
        },
        include: [
          {
            model: Employee,
            as: "employee",
          },
          {
            model: System,
          },
        ],
      },
    ];
  }

  // ============================================================
  // LIST UNITS
  // ============================================================

  async findAll(params: {
    assetId?: string;
    organisationId?: string;
    status?: AssetUnitStatus;
    condition?: AssetUnitCondition;
    locationId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(params.page ?? 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100);

    const andConditions: WhereOptions<AssetUnit>[] = [];

    if (params.assetId) {
      andConditions.push({
        assetId: params.assetId,
      });
    }

    if (params.status) {
      andConditions.push({
        status: params.status,
      });
    }

    if (params.condition) {
      andConditions.push({
        condition: params.condition,
      });
    }

    if (params.locationId) {
      andConditions.push({
        locationId: params.locationId,
      });
    }

    if (params.organisationId) {
      andConditions.push({
        "$asset.organisationId$": params.organisationId,
      } as WhereOptions<AssetUnit>);
    }

    if (params.search?.trim()) {
      const like = {
        [Op.like]: `%${params.search.trim()}%`,
      };

      andConditions.push({
        [Op.or]: [
          {
            unitCode: like,
          },
          {
            serialNumber: like,
          },
          {
            "$asset.name$": like,
          },
          {
            "$asset.assetTag$": like,
          },
        ],
      } as WhereOptions<AssetUnit>);
    }

    const where =
      andConditions.length > 0
        ? {
            [Op.and]: andConditions,
          }
        : {};

    const { rows, count } = await this.assetUnitModel.findAndCountAll({
      where,

      include: this.unitInclude,

      order: [["createdAt", "DESC"]],

      limit: pageSize,
      offset: (page - 1) * pageSize,

      distinct: true,

      subQuery: false,
    });

    return {
      items: rows,
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    };
  }

  // ============================================================
  // FIND ONE
  // ============================================================

  async findOne(id: string) {
    const unit = await this.assetUnitModel.findByPk(id, {
      include: this.unitInclude,
    });

    if (!unit) {
      throw new NotFoundException("Asset unit not found.");
    }

    return unit;
  }

  // ============================================================
  // CREATE UNIT
  // ============================================================

  async create(
    assetId: string,
    data: {
      unitCode?: string | null;
      serialNumber?: string | null;
      status?: AssetUnitStatus;
      condition?: AssetUnitCondition;
      locationId?: string | null;
      notes?: string | null;
    },
    actor: AuthUser,
    transaction?: Transaction,
  ) {
    const run = async (t: Transaction) => {
      const asset = await this.assetModel.findByPk(assetId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!asset) {
        throw new NotFoundException("Asset not found.");
      }

      // --------------------------------------------------------
      // UNIT CODE DUPLICATE
      // --------------------------------------------------------

      if (data.unitCode) {
        const duplicate = await this.assetUnitModel.findOne({
          where: {
            unitCode: data.unitCode,
          },
          transaction: t,
        });

        if (duplicate) {
          throw new ConflictException(
            "An asset unit with this unit code already exists.",
          );
        }
      }

      // --------------------------------------------------------
      // SERIAL DUPLICATE
      // --------------------------------------------------------

      if (data.serialNumber) {
        const duplicate = await this.assetUnitModel.findOne({
          where: {
            serialNumber: data.serialNumber,
          },
          transaction: t,
        });

        if (duplicate) {
          throw new ConflictException(
            "An asset unit with this serial number already exists.",
          );
        }
      }

      // --------------------------------------------------------
      // LOCATION
      // --------------------------------------------------------

      if (data.locationId) {
        const location = await this.locationModel.findByPk(data.locationId, {
          transaction: t,
        });

        if (!location) {
          throw new NotFoundException("Location not found.");
        }

        if (
          location.organisationId !== null &&
          location.organisationId !== asset.organisationId
        ) {
          throw new BadRequestException(
            "The selected location does not belong to this asset organisation.",
          );
        }
      }

      // --------------------------------------------------------
      // CREATE
      // --------------------------------------------------------

      const unit = await this.assetUnitModel.create(
        {
          assetId,

          unitCode: data.unitCode ?? null,

          serialNumber: data.serialNumber ?? null,

          status: data.status ?? AssetUnitStatus.AVAILABLE,

          condition: data.condition ?? AssetUnitCondition.GOOD,

          locationId: data.locationId ?? asset.locationId ?? null,

          notes: data.notes ?? null,
        } as AssetUnit,
        {
          transaction: t,
        },
      );

      // --------------------------------------------------------
      // HISTORY
      // --------------------------------------------------------

      await this.assetHistoryModel.create(
        {
          assetId,

          assetUnitId: unit.id,

          action: "UNIT_CREATED",

          performedBy: actor.name,

          toValue: unit.unitCode ?? unit.serialNumber ?? unit.id,
        } as AssetHistory,
        {
          transaction: t,
        },
      );

      // --------------------------------------------------------
      // AUDIT
      // --------------------------------------------------------

      await this.audit.log(
        {
          userId: actor.id,

          action: "ASSET_UNIT_CREATED",

          entity: "AssetUnit",

          entityId: unit.id,

          metadata: {
            assetId,
            unitCode: unit.unitCode,
            serialNumber: unit.serialNumber,
          },
        },
        t,
      );

      return this.assetUnitModel.findByPk(unit.id, {
        include: this.unitInclude,
        transaction: t,
      });
    };

    if (transaction) {
      return run(transaction);
    }

    return this.sequelize.transaction(run);
  }

  // ============================================================
  // UPDATE UNIT
  // ============================================================

  async update(
    id: string,
    data: {
      unitCode?: string | null;
      serialNumber?: string | null;
      status?: AssetUnitStatus;
      condition?: AssetUnitCondition;
      locationId?: string | null;
      notes?: string | null;
    },
    actor: AuthUser,
  ) {
    return this.sequelize.transaction(async (t) => {
      const unit = await this.assetUnitModel.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!unit) {
        throw new NotFoundException("Asset unit not found.");
      }

      const asset = await this.assetModel.findByPk(unit.assetId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!asset) {
        throw new NotFoundException("Parent asset not found.");
      }

      // --------------------------------------------------------
      // UNIT CODE
      // --------------------------------------------------------

      if (data.unitCode !== undefined && data.unitCode !== unit.unitCode) {
        if (data.unitCode) {
          const duplicate = await this.assetUnitModel.findOne({
            where: {
              unitCode: data.unitCode,
              id: {
                [Op.ne]: id,
              },
            },
            transaction: t,
          });

          if (duplicate) {
            throw new ConflictException(
              "An asset unit with this unit code already exists.",
            );
          }
        }
      }

      // --------------------------------------------------------
      // SERIAL
      // --------------------------------------------------------

      if (
        data.serialNumber !== undefined &&
        data.serialNumber !== unit.serialNumber
      ) {
        if (data.serialNumber) {
          const duplicate = await this.assetUnitModel.findOne({
            where: {
              serialNumber: data.serialNumber,
              id: {
                [Op.ne]: id,
              },
            },
            transaction: t,
          });

          if (duplicate) {
            throw new ConflictException(
              "An asset unit with this serial number already exists.",
            );
          }
        }
      }

      // --------------------------------------------------------
      // LOCATION
      // --------------------------------------------------------

      if (data.locationId !== undefined && data.locationId) {
        const location = await this.locationModel.findByPk(data.locationId, {
          transaction: t,
        });

        if (!location) {
          throw new NotFoundException("Location not found.");
        }

        if (
          location.organisationId !== null &&
          location.organisationId !== asset.organisationId
        ) {
          throw new BadRequestException(
            "The selected location does not belong to this asset organisation.",
          );
        }
      }

      // --------------------------------------------------------
      // STATUS VALIDATION
      // --------------------------------------------------------

      if (data.status !== undefined && data.status !== unit.status) {
        const activeAssignment = await this.assetAssignmentModel.findOne({
          where: {
            assetUnitId: id,
            status: AssignmentStatus.ACTIVE,
          },
          transaction: t,
        });

        if (data.status === AssetUnitStatus.AVAILABLE && activeAssignment) {
          throw new BadRequestException(
            "Return the active assignment before marking this unit available.",
          );
        }

        if (data.status === AssetUnitStatus.ASSIGNED && !activeAssignment) {
          throw new BadRequestException(
            "Assign the unit before marking it assigned.",
          );
        }
      }

      const previousStatus = unit.status;
      const previousCondition = unit.condition;

      // --------------------------------------------------------
      // UPDATE
      // --------------------------------------------------------

      await unit.update(
        {
          ...(data.unitCode !== undefined
            ? {
                unitCode: data.unitCode,
              }
            : {}),

          ...(data.serialNumber !== undefined
            ? {
                serialNumber: data.serialNumber,
              }
            : {}),

          ...(data.status !== undefined
            ? {
                status: data.status,
              }
            : {}),

          ...(data.condition !== undefined
            ? {
                condition: data.condition,
              }
            : {}),

          ...(data.locationId !== undefined
            ? {
                locationId: data.locationId,
              }
            : {}),

          ...(data.notes !== undefined
            ? {
                notes: data.notes,
              }
            : {}),
        },
        {
          transaction: t,
        },
      );

      // --------------------------------------------------------
      // HISTORY
      // --------------------------------------------------------

      if (data.status !== undefined && data.status !== previousStatus) {
        await this.assetHistoryModel.create(
          {
            assetId: unit.assetId,

            assetUnitId: unit.id,

            action: "UNIT_STATUS_CHANGED",

            performedBy: actor.name,

            fromValue: previousStatus,

            toValue: data.status,
          } as AssetHistory,
          {
            transaction: t,
          },
        );
      }

      if (
        data.condition !== undefined &&
        data.condition !== previousCondition
      ) {
        await this.assetHistoryModel.create(
          {
            assetId: unit.assetId,

            assetUnitId: unit.id,

            action: "UNIT_CONDITION_CHANGED",

            performedBy: actor.name,

            fromValue: previousCondition,

            toValue: data.condition,
          } as AssetHistory,
          {
            transaction: t,
          },
        );
      }

      await this.audit.log(
        {
          userId: actor.id,

          action: "ASSET_UNIT_UPDATED",

          entity: "AssetUnit",

          entityId: unit.id,

          metadata: data as Record<string, unknown>,
        },
        t,
      );

      return this.assetUnitModel.findByPk(id, {
        include: this.unitInclude,
        transaction: t,
      });
    });
  }

  // ============================================================
  // ASSIGN UNIT
  // ============================================================

  async assign(
    id: string,
    dto: {
      employeeId?: string;
      systemId?: string;
      notes?: string;
    },
    actor: AuthUser,
  ) {
    if (Boolean(dto.employeeId) === Boolean(dto.systemId)) {
      throw new BadRequestException("Choose exactly one employee or system.");
    }

    return this.sequelize.transaction(async (t) => {
      const unit = await this.assetUnitModel.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!unit) {
        throw new NotFoundException("Asset unit not found.");
      }

      if (
        [
          AssetUnitStatus.REPAIR,
          AssetUnitStatus.LOST,
          AssetUnitStatus.DAMAGED,
          AssetUnitStatus.RETIRED,
          AssetUnitStatus.DISPOSED,
        ].includes(unit.status)
      ) {
        throw new BadRequestException(
          `${unit.status} units cannot be assigned.`,
        );
      }

      if (unit.status === AssetUnitStatus.ASSIGNED) {
        throw new BadRequestException("This unit is already assigned.");
      }

      const employee = dto.employeeId
        ? await this.employeeModel.findByPk(dto.employeeId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
          })
        : null;

      if (dto.employeeId && !employee) {
        throw new NotFoundException("Employee not found.");
      }

      if (
        employee &&
        ![EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE].includes(
          employee.status,
        )
      ) {
        throw new BadRequestException(
          "Cannot assign to an inactive or exited employee.",
        );
      }

      const system = dto.systemId
        ? await System.findByPk(dto.systemId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
          })
        : null;

      if (dto.systemId && !system) {
        throw new NotFoundException("System not found.");
      }

      const duplicate = await this.assetAssignmentModel.findOne({
        where: {
          assetUnitId: id,

          status: AssignmentStatus.ACTIVE,

          ...(dto.employeeId
            ? {
                employeeId: dto.employeeId,
              }
            : {
                systemId: dto.systemId,
              }),
        },

        transaction: t,
      });

      if (duplicate) {
        throw new ConflictException(
          "This unit is already assigned to this target.",
        );
      }

      const assignment = await this.assetAssignmentModel.create(
        {
          assetId: unit.assetId,

          assetUnitId: id,

          employeeId: dto.employeeId ?? null,

          systemId: dto.systemId ?? null,

          assignedBy: actor.id,

          status: AssignmentStatus.ACTIVE,

          notes: dto.notes ?? null,
        } as AssetAssignment,
        {
          transaction: t,
        },
      );

      await unit.update(
        {
          status: AssetUnitStatus.ASSIGNED,
        },
        {
          transaction: t,
        },
      );

      await this.assetHistoryModel.create(
        {
          assetId: unit.assetId,

          assetUnitId: id,

          action: "UNIT_ASSIGNED",

          performedBy: actor.name,

          toValue: system
            ? `System: ${system.systemTag} (${system.name})`
            : employee!.name,

          notes: dto.notes ?? null,
        } as AssetHistory,
        {
          transaction: t,
        },
      );

      await this.audit.log(
        {
          userId: actor.id,

          action: "ASSET_UNIT_ASSIGNED",

          entity: "AssetUnit",

          entityId: id,

          metadata: {
            assetId: unit.assetId,
            employeeId: dto.employeeId ?? null,
            systemId: dto.systemId ?? null,
            assignmentId: assignment.id,
          },
        },
        t,
      );

      await this.syncParentAsset(unit.assetId, t);

      // Inventory history (custody event — physical qty unchanged)
      const parent = await this.assetModel.findByPk(unit.assetId, {
        transaction: t,
      });
      if (parent) {
        await this.inventoryHistoryModel.create(
          {
            assetId: unit.assetId,
            changeType: InventoryChangeType.ASSIGNED,
            quantityDelta: 0,
            quantityAfter: parent.quantity ?? 0,
            quantityAssignedAfter: parent.quantityAssigned ?? 0,
            performedBy: actor.name,
            reason: dto.notes ?? null,
          } as InventoryHistory,
          { transaction: t },
        );
      }

      return this.findOne(id);
    });
  }

  // ============================================================
  // RETURN UNIT
  // ============================================================

  async returnUnit(id: string, actor: AuthUser, notes?: string) {
    return this.sequelize.transaction(async (t) => {
      const unit = await this.assetUnitModel.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!unit) {
        throw new NotFoundException("Asset unit not found.");
      }

      const assignment = await this.assetAssignmentModel.findOne({
        where: {
          assetUnitId: id,
          status: AssignmentStatus.ACTIVE,
        },

        include: [
          {
            model: Employee,
            as: "employee",
          },
          {
            model: System,
          },
        ],

        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!assignment) {
        throw new BadRequestException("This unit is not currently assigned.");
      }

      await assignment.update(
        {
          status: AssignmentStatus.RETURNED,

          returnedAt: new Date(),

          notes: notes ?? assignment.notes,
        },
        {
          transaction: t,
        },
      );

      await unit.update(
        {
          status: AssetUnitStatus.AVAILABLE,
        },
        {
          transaction: t,
        },
      );

      await this.assetHistoryModel.create(
        {
          assetId: unit.assetId,

          assetUnitId: id,

          action: "UNIT_RETURNED",

          performedBy: actor.name,

          fromValue: assignment.system
            ? `System: ${assignment.system.systemTag}`
            : (assignment.employee?.name ?? "Assigned"),

          toValue: "Available",

          notes: notes ?? null,
        } as AssetHistory,
        {
          transaction: t,
        },
      );

      await this.audit.log(
        {
          userId: actor.id,

          action: "ASSET_UNIT_RETURNED",

          entity: "AssetUnit",

          entityId: id,

          metadata: {
            assetId: unit.assetId,
            employeeId: assignment.employeeId,
            systemId: assignment.systemId,
            assignmentId: assignment.id,
          },
        },
        t,
      );

      await this.syncParentAsset(unit.assetId, t);

      // Inventory history (custody event — physical qty unchanged)
      const parent = await this.assetModel.findByPk(unit.assetId, {
        transaction: t,
      });
      if (parent) {
        await this.inventoryHistoryModel.create(
          {
            assetId: unit.assetId,
            changeType: InventoryChangeType.RETURNED,
            quantityDelta: 0,
            quantityAfter: parent.quantity ?? 0,
            quantityAssignedAfter: parent.quantityAssigned ?? 0,
            performedBy: actor.name,
            reason: notes ?? null,
          } as InventoryHistory,
          { transaction: t },
        );
      }

      return this.findOne(id);
    });
  }

  // ============================================================
  // CHANGE STATUS
  // ============================================================

  async changeStatus(
    id: string,
    status: AssetUnitStatus,
    actor: AuthUser,
    notes?: string,
  ) {
    return this.sequelize.transaction(async (t) => {
      const unit = await this.assetUnitModel.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!unit) {
        throw new NotFoundException("Asset unit not found.");
      }

      if (unit.status === status) {
        return unit;
      }

      const assignment = await this.assetAssignmentModel.findOne({
        where: {
          assetUnitId: id,
          status: AssignmentStatus.ACTIVE,
        },
        transaction: t,
      });

      if (status !== AssetUnitStatus.ASSIGNED && assignment) {
        throw new BadRequestException(
          "Return the active assignment before changing this unit to another status.",
        );
      }

      const previousStatus = unit.status;

      await unit.update(
        {
          status,
        },
        {
          transaction: t,
        },
      );

      await this.assetHistoryModel.create(
        {
          assetId: unit.assetId,

          assetUnitId: unit.id,

          action: "UNIT_STATUS_CHANGED",

          performedBy: actor.name,

          fromValue: previousStatus,

          toValue: status,

          notes: notes ?? null,
        } as AssetHistory,
        {
          transaction: t,
        },
      );

      await this.audit.log(
        {
          userId: actor.id,

          action: "ASSET_UNIT_STATUS_CHANGED",

          entity: "AssetUnit",

          entityId: unit.id,

          metadata: {
            assetId: unit.assetId,

            from: previousStatus,

            to: status,

            notes: notes ?? null,
          },
        },
        t,
      );

      await this.syncParentAsset(unit.assetId, t);

      return this.findOne(id);
    });
  }

  // ============================================================
  // CHANGE CONDITION
  // ============================================================

  async changeCondition(
    id: string,
    condition: AssetUnitCondition,
    actor: AuthUser,
    notes?: string,
  ) {
    return this.sequelize.transaction(async (t) => {
      const unit = await this.assetUnitModel.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!unit) {
        throw new NotFoundException("Asset unit not found.");
      }

      const previousCondition = unit.condition;

      if (previousCondition === condition) {
        return unit;
      }

      await unit.update(
        {
          condition,
        },
        {
          transaction: t,
        },
      );

      await this.assetHistoryModel.create(
        {
          assetId: unit.assetId,

          assetUnitId: unit.id,

          action: "UNIT_CONDITION_CHANGED",

          performedBy: actor.name,

          fromValue: previousCondition,

          toValue: condition,

          notes: notes ?? null,
        } as AssetHistory,
        {
          transaction: t,
        },
      );

      await this.audit.log(
        {
          userId: actor.id,

          action: "ASSET_UNIT_CONDITION_CHANGED",

          entity: "AssetUnit",

          entityId: unit.id,

          metadata: {
            assetId: unit.assetId,

            from: previousCondition,

            to: condition,
          },
        },
        t,
      );

      return this.findOne(id);
    });
  }

  // ============================================================
  // DELETE UNIT
  // ============================================================

  async remove(id: string, actor: AuthUser) {
    return this.sequelize.transaction(async (t) => {
      const unit = await this.assetUnitModel.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!unit) {
        throw new NotFoundException("Asset unit not found.");
      }

      if (unit.status === AssetUnitStatus.ASSIGNED) {
        throw new BadRequestException(
          "Assigned units cannot be deleted. Return the unit first.",
        );
      }

      const activeAssignment = await this.assetAssignmentModel.count({
        where: {
          assetUnitId: id,
          status: AssignmentStatus.ACTIVE,
        },
        transaction: t,
      });

      if (activeAssignment > 0) {
        throw new BadRequestException("This unit has an active assignment.");
      }

      const assetId = unit.assetId;

      await this.assetHistoryModel.create(
        {
          assetId,

          assetUnitId: id,

          action: "UNIT_DELETED",

          performedBy: actor.name,

          fromValue: unit.unitCode ?? unit.serialNumber ?? unit.id,
        } as AssetHistory,
        {
          transaction: t,
        },
      );

      await this.audit.log(
        {
          userId: actor.id,

          action: "ASSET_UNIT_DELETED",

          entity: "AssetUnit",

          entityId: id,

          metadata: {
            assetId,
          },
        },
        t,
      );

      await unit.destroy({
        transaction: t,
      });

      await this.syncParentAsset(assetId, t);

      return {
        success: true,
        id,
      };
    });
  }

  // ============================================================
  // SUMMARY FOR ONE ASSET
  // ============================================================

  async summary(assetId: string) {
    const asset = await this.assetModel.findByPk(assetId);

    if (!asset) {
      throw new NotFoundException("Asset not found.");
    }

    const units = await this.assetUnitModel.findAll({
      where: {
        assetId,
      },
      attributes: ["status", "condition"],
    });

    const summary = {
      total: units.length,

      available: 0,

      assigned: 0,

      repair: 0,

      damaged: 0,

      lost: 0,

      retired: 0,

      disposed: 0,

      new: 0,

      good: 0,

      fair: 0,

      poor: 0,
    };

    for (const unit of units) {
      switch (unit.status) {
        case AssetUnitStatus.AVAILABLE:
          summary.available++;
          break;

        case AssetUnitStatus.ASSIGNED:
          summary.assigned++;
          break;

        case AssetUnitStatus.REPAIR:
          summary.repair++;
          break;

        case AssetUnitStatus.DAMAGED:
          summary.damaged++;
          break;

        case AssetUnitStatus.LOST:
          summary.lost++;
          break;

        case AssetUnitStatus.RETIRED:
          summary.retired++;
          break;

        case AssetUnitStatus.DISPOSED:
          summary.disposed++;
          break;
      }

      switch (unit.condition) {
        case AssetUnitCondition.NEW:
          summary.new++;
          break;

        case AssetUnitCondition.GOOD:
          summary.good++;
          break;

        case AssetUnitCondition.FAIR:
          summary.fair++;
          break;

        case AssetUnitCondition.POOR:
          summary.poor++;
          break;
      }
    }

    return {
      assetId,

      assetQuantity: asset.quantity,

      ...summary,
    };
  }

  // ============================================================
  // SYNC LEGACY PARENT FIELDS
  //
  // During migration we keep assets.status and
  // assets.quantityAssigned populated so old APIs do not
  // immediately break.
  // ============================================================

  async syncParentAsset(assetId: string, transaction: Transaction) {
    const asset = await this.assetModel.findByPk(assetId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!asset) {
      return;
    }

    const units = await this.assetUnitModel.findAll({
      where: {
        assetId,
      },

      attributes: ["id", "status", "condition"],

      transaction,
    });

    if (units.length === 0) {
      return;
    }

    const assigned = units.filter(
      (unit) => unit.status === AssetUnitStatus.ASSIGNED,
    ).length;

    const available = units.filter(
      (unit) => unit.status === AssetUnitStatus.AVAILABLE,
    ).length;

    const repair = units.filter(
      (unit) => unit.status === AssetUnitStatus.REPAIR,
    ).length;

    const damaged = units.filter(
      (unit) => unit.status === AssetUnitStatus.DAMAGED,
    ).length;

    const lost = units.filter(
      (unit) => unit.status === AssetUnitStatus.LOST,
    ).length;

    let parentStatus: AssetStatus;

    if (assigned > 0) {
      parentStatus =
        assigned === units.length
          ? AssetStatus.ASSIGNED
          : AssetStatus.AVAILABLE;
    } else if (available > 0) {
      parentStatus = AssetStatus.AVAILABLE;
    } else if (repair > 0) {
      parentStatus = AssetStatus.REPAIR;
    } else if (damaged > 0) {
      parentStatus = AssetStatus.DAMAGED;
    } else if (lost > 0) {
      parentStatus = AssetStatus.LOST;
    } else {
      parentStatus = AssetStatus.AVAILABLE;
    }

    await asset.update(
      {
        quantity: Math.max(asset.quantity ?? units.length, units.length),

        quantityAssigned: assigned,

        status: parentStatus,
      },
      {
        transaction,
      },
    );
  }
}
