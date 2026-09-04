import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/sequelize";
import { Transaction, WhereOptions } from "sequelize";

import { AuditLog } from "./models/audit-log.model";
import { User } from "@/modules/users/models/user.model";

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog)
    private readonly auditLogModel: typeof AuditLog,
  ) {}

  /**
   * Create an audit log entry.
   *
   * UUID-based:
   * - userId -> string
   * - entityId -> string
   *
   * The optional transaction allows the audit record to be committed
   * or rolled back together with the business operation.
   */
  async log(
    params: {
      userId?: string | null;
      action: string;
      entity: string;
      entityId: string;
      metadata?: Record<string, unknown>;
    },
    transaction?: Transaction,
  ): Promise<AuditLog> {
    return this.auditLogModel.create(
      {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata ?? null,
      } as AuditLog,
      {
        transaction,
      },
    );
  }

  /**
   * List audit logs with optional filtering and pagination.
   */
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

    return {
      items,
      total,
    };
  }
}
