import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  // Writes an audit entry. Accepts an optional Prisma transaction client so a caller
  // can include the audit write inside the same DB transaction as the business change.
  async log(
    params: {
      userId?: number;
      action: string;
      entity: string;
      entityId: string | number;
      metadata?: Record<string, unknown>;
    },
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: String(params.entityId),
        metadata: params.metadata as any,
      },
    });
  }

  async list(params: {
    entity?: string;
    action?: string;
    take?: number;
    skip?: number;
  }) {
    const where: Prisma.AuditLogWhereInput = {
      entity: params.entity,
      action: params.action,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: params.take ?? 50,
        skip: params.skip ?? 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total };
  }
}
