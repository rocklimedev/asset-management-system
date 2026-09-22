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
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "@/common/decorator/current-user.decorator";
import { CreateSystemDto, UpdateSystemDto } from "./dto/system.dto";

@Injectable()
export class SystemsService {
  constructor(
    @InjectConnection() private readonly db: Sequelize,
    private readonly audit: AuditService,
  ) {}
  private get include() {
    return [
      Employee,
      {
        model: AssetAssignment,
        where: { status: AssignmentStatus.ACTIVE },
        required: false,
        include: [{ model: Asset, include: [AssetCategory] }],
      },
    ];
  }
  list(search?: string, employeeId?: string) {
    return System.findAll({
      where: {
        ...(employeeId ? { employeeId } : {}),
        ...(search?.trim()
          ? {
              [Op.or]: [
                { name: { [Op.like]: `%${search.trim()}%` } },
                { systemTag: { [Op.like]: `%${search.trim()}%` } },
              ],
            }
          : {}),
      },
      include: this.include,
      order: [["name", "ASC"]],
    });
  }
  async get(id: string) {
    const system = await System.findByPk(id, { include: this.include });
    if (!system) throw new NotFoundException("System not found.");
    return system;
  }
  async create(dto: CreateSystemDto, actor: AuthUser) {
    try {
      return await this.db.transaction(async (transaction) => {
        const system = await System.create(
          { ...dto, employeeId: null } as System,
          { transaction },
        );
        await this.audit.log(
          {
            userId: actor.id,
            action: "SYSTEM_CREATED",
            entity: "System",
            entityId: system.id,
            metadata: { ...dto },
          },
          transaction,
        );
        return system;
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError)
        throw new ConflictException("System tag already exists.");
      throw error;
    }
  }
  async update(id: string, dto: UpdateSystemDto, actor: AuthUser) {
    if (dto.name === null || dto.systemTag === null)
      throw new BadRequestException("Name and system tag cannot be null.");
    try {
      return await this.db.transaction(async (transaction) => {
        const system = await System.findByPk(id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!system) throw new NotFoundException("System not found.");
        await system.update(dto, { transaction });
        await this.audit.log(
          {
            userId: actor.id,
            action: "SYSTEM_UPDATED",
            entity: "System",
            entityId: id,
            metadata: { ...dto },
          },
          transaction,
        );
        return system;
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError)
        throw new ConflictException("System tag already exists.");
      throw error;
    }
  }
  async setEmployee(id: string, employeeId: string | null, actor: AuthUser) {
    return this.db.transaction(async (transaction) => {
      const employee = employeeId
        ? await Employee.findByPk(employeeId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
          })
        : null;
      if (employeeId && !employee)
        throw new NotFoundException("Employee not found.");
      if (
        employee &&
        ![EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE].includes(
          employee.status,
        )
      )
        throw new BadRequestException(
          "Systems can only be assigned to active employees or employees on leave.",
        );
      const system = await System.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!system) throw new NotFoundException("System not found.");
      if (system.employeeId === employeeId)
        throw new BadRequestException("System already has this assignment.");
      const previous = system.employeeId
        ? await Employee.findByPk(system.employeeId, { transaction })
        : null;
      const fromEmployeeId = system.employeeId;
      await system.update({ employeeId }, { transaction });
      const components = await AssetAssignment.findAll({
        where: { systemId: id, status: AssignmentStatus.ACTIVE },
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
          { transaction },
        );
      }
      await this.audit.log(
        {
          userId: actor.id,
          action: employeeId ? "SYSTEM_ASSIGNED" : "SYSTEM_RETURNED",
          entity: "System",
          entityId: id,
          metadata: { fromEmployeeId, employeeId, systemTag: system.systemTag },
        },
        transaction,
      );
      return System.findByPk(id, { include: this.include, transaction });
    });
  }
}
