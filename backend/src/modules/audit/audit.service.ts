import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Transaction, WhereOptions } from "sequelize";

import { AuditLog } from "./models/audit-log.model";
import { User } from "../users/models/user.model";

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog)
    private readonly auditLogModel: typeof AuditLog,
  ) {}

  // Writes an audit entry. Accepts an optional Sequelize transaction so a caller
  // can include the audit write inside the same DB transaction as the business change.
  async log(
    params: {
      userId?: number;
      action: string;
      entity: string;
      entityId: string | number;
      metadata?: Record<string, unknown>;
    },
    transaction?: Transaction,
  ) {
    return this.auditLogModel.create(
      {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: String(params.entityId),
        metadata: params.metadata,
      } as AuditLog,
      { transaction },
    );
  }

  async list(params: {
    entity?: string;
    action?: string;
    take?: number;
    skip?: number;
  }) {
    const where: WhereOptions<AuditLog> = {
      ...(params.entity !== undefined ? { entity: params.entity } : {}),
      ...(params.action !== undefined ? { action: params.action } : {}),
    };

    const { rows: items, count: total } =
      await this.auditLogModel.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: params.take ?? 50,
        offset: params.skip ?? 0,
      });

    return { items, total };
  }
}
