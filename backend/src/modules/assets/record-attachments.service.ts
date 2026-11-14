import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { randomUUID } from 'crypto';
import { Asset } from './models/asset.model';
import { System } from './models/system.model';
import { CdnService, CdnUploadFile } from '../cdn/cdn.service';
export interface RecordAttachment { id: string; key: string; url: string; name: string; mimeType: string; size: number; purpose: 'image' | 'invoice'; }
@Injectable()
export class RecordAttachmentsService {
  constructor(@InjectConnection() private readonly db: Sequelize, private readonly cdn: CdnService) {}
  private async record(resource: string, id: string, options = {}): Promise<Asset | System> {
    if (!['assets', 'systems'].includes(resource)) throw new BadRequestException('Invalid attachment resource.');
    const record = resource === 'assets' ? await Asset.findByPk(id, options) : await System.findByPk(id, options);
    if (!record) throw new NotFoundException('Record not found.');
    return record;
  }
  async list(resource: string, id: string) { return (await this.record(resource, id)).attachments || []; }
  async upload(resource: string, id: string, purpose: 'image' | 'invoice', file?: CdnUploadFile) {
    if (!['image', 'invoice'].includes(purpose)) throw new BadRequestException('Choose image or invoice.');
    await this.record(resource, id);
    const uploaded = await this.cdn.upload(file, { resourceType: resource, resourceId: id, purpose });
    const attachment: RecordAttachment = { ...uploaded, id: randomUUID(), purpose, name: (file?.originalname || purpose).slice(0, 255) };
    try {
      await this.db.transaction(async transaction => {
        const record = await this.record(resource, id, { transaction, lock: transaction.LOCK.UPDATE });
        const attachments = [...(record.attachments || []), attachment];
        if (resource === 'assets') {
          await (record as Asset).update({ attachments, ...(purpose === 'image' ? { imageKey: uploaded.key, imageUrl: uploaded.url } : {}) }, { transaction });
        } else {
          await (record as System).update({ attachments }, { transaction });
        }
      });
    } catch (error) { await this.cdn.deleteFile(uploaded.key).catch(() => undefined); throw error; }
    return attachment;
  }
}
