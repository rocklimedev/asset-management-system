import { ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { createHash, randomUUID } from 'node:crypto';

/** Explicit SQL repository: no schema synchronization; see migration 011. */
@Injectable()
export class IntegrationStore {
  constructor(private readonly db: Sequelize) {}

  async rows<T extends Record<string, any> = Record<string, any>>(
    sql: string,
    replacements: Record<string, any> = {},
  ): Promise<T[]> {
    try {
      return (await this.db.query(sql, {
        replacements,
        type: QueryTypes.SELECT,
        logging: false,
      })) as T[];
    } catch {
      throw new ServiceUnavailableException('Integration storage unavailable');
    }
  }
  async run(sql: string, replacements: Record<string, any> = {}) {
    try {
      await this.db.query(sql, { replacements, logging: false });
    } catch {
      throw new ServiceUnavailableException('Integration storage write failed');
    }
  }
  async one(sql: string, replacements: Record<string, any> = {}) {
    return (await this.rows(sql, replacements))[0];
  }
  async atomic(operations: Array<{ sql: string; values: Record<string, any> }>) {
    try {
      await this.db.transaction({ logging: false }, async (transaction) => {
        for (const operation of operations)
          await this.db.query(operation.sql, {
            replacements: operation.values,
            transaction,
            logging: false,
          });
      });
    } catch {
      throw new ServiceUnavailableException('Integration storage transaction failed');
    }
  }
  async log(
    operation: string,
    entityId: string,
    status: string,
    actorId?: string,
    errorCode?: string,
  ) {
    await this.run(
      `INSERT INTO integration_logs (id,provider,operation,entityId,status,actorId,errorCode,createdAt)
      VALUES (:id,'zoho',:operation,:entityId,:status,:actorId,:errorCode,NOW())`,
      {
        id: randomUUID(),
        operation,
        entityId,
        status,
        actorId: actorId || null,
        errorCode: errorCode || null,
      },
    );
  }
  /** MySQL named lock is held on a dedicated connection, across short durable writes.
   * Unlike a lease it cannot expire while an external side effect is in flight. */
  async locked<T>(key: string, action: () => Promise<T>): Promise<T> {
    const name = 'itam:' + createHash('sha256').update(key).digest('hex').slice(0, 48);
    return this.db.transaction({ logging: false }, async (transaction) => {
      const [row] = await this.db.query<{ acquired: number }>(
        'SELECT GET_LOCK(:name, 0) AS acquired',
        {
          replacements: { name },
          type: QueryTypes.SELECT,
          transaction,
          logging: false,
        },
      );
      if (Number(row.acquired) !== 1)
        throw new ConflictException('Operation already running; retry shortly.');
      try {
        return await action();
      } finally {
        await this.db.query('SELECT RELEASE_LOCK(:name)', {
          replacements: { name },
          transaction,
          logging: false,
        });
      }
    });
  }
}
