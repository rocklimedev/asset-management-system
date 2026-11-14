import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction, WhereOptions } from 'sequelize';

import { AuditLog } from './models/audit-log.model';
import { User } from '@/modules/users/models/user.model';

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
    search?: string;
    from?: string;
    to?: string;
  }) {
    // Match the words users see ("Asset Created") against stored action keys
    // ("ASSET_CREATED"), while allowing words to span user/action/entity fields.
    const words = params.search?.trim().split(/\s+/).filter(Boolean) ?? [];
    const where: WhereOptions<AuditLog> = {
      ...(params.entity?.trim() ? { entity: params.entity.trim() } : {}),

      ...(params.action?.trim() ? { action: params.action.trim() } : {}),
      ...(words.length
        ? {
            [Op.and]: words.map((word) => ({
              [Op.or]: ['action', 'entity', 'entityId', '$user.name$', '$user.email$'].map(
                (field) => ({
                  [field]: { [Op.like]: `%${word.replace(/[\\%_]/g, '\\$&')}%` },
                }),
              ),
            })),
          }
        : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { [Op.gte]: new Date(`${params.from}T00:00:00.000Z`) } : {}),
              ...(params.to
                ? { [Op.lt]: new Date(Date.parse(`${params.to}T00:00:00.000Z`) + 86400000) }
                : {}),
            },
          }
        : {}),
    };

    const { rows: items, count: total } = await this.auditLogModel.findAndCountAll({
      where,
      // The activity feed exposes event identity, not raw historical payloads.
      attributes: ['id', 'action', 'entity', 'entityId', 'createdAt', 'userId'],

      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
        },
      ],

      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],

      limit: params.take ?? 50,
      offset: params.skip ?? 0,
    });

    return {
      items,
      total,
      page: Math.floor((params.skip ?? 0) / (params.take ?? 50)) + 1,
      pageSize: params.take ?? 50,
    };
  }
}
