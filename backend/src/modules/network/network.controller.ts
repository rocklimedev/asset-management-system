import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Post, Put } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { IsInt, IsObject, Min } from 'class-validator';
import { RequirePermissions } from '../../common/decorator/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorator/current-user.decorator';
import { AuditService } from '../audit/audit.service';
import { NetworkMap } from './network.model';
import { validateNetwork } from './network.validation';
import { upgradeNetwork } from './network.legacy';
import { persistTopology } from './network.storage';
import { OFFICE_NETWORK_ID } from './network.ids';
class DocumentDto {
  @IsObject() document!: Record<string, unknown>;
}
class SaveNetworkDto extends DocumentDto { @IsInt() @Min(1) revision!: number; }
@Controller('network')
@RequirePermissions('network.manage')
export class NetworkController {
  constructor(@InjectModel(NetworkMap) private readonly maps: typeof NetworkMap, private readonly audit: AuditService) {}
  @Get()
  async get() {
    const map = await this.maps.findByPk(OFFICE_NETWORK_ID);
    if (!map) throw new NotFoundException('Run the network migration and seeder first.');
    return { ...map.toJSON(), document: upgradeNetwork(map.document) };
  }
  @Post('validate')
  validate(@Body() dto: DocumentDto) {
    try {
      const document = upgradeNetwork(dto.document);
      validateNetwork(document);
      return { document };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Invalid network JSON. Import a topology export or the original HTML map JSON.');
    }
  }
  @Put()
  async save(@Body() dto: SaveNetworkDto, @CurrentUser() user: AuthUser) {
    const document = dto.document;
    validateNetwork(document);
    return this.maps.sequelize!.transaction(async transaction => {
      const map = await this.maps.findByPk(OFFICE_NETWORK_ID, { transaction, lock: transaction.LOCK.UPDATE });
      if (!map) throw new NotFoundException('Network map has not been seeded.');
      if (map.revision !== dto.revision) throw new ConflictException('Someone else saved this map. Export your changes before reloading.');
      const query = (sql: string, replacements: any[]) => this.maps.sequelize!.query(sql, { replacements, transaction });
      if (JSON.stringify(upgradeNetwork(map.document)) !== JSON.stringify(map.document)) {
        await query('INSERT IGNORE INTO network_map_legacy_backups (map_id, revision, document, backed_up_at) VALUES (?, ?, ?, NOW())', [map.id, map.revision, JSON.stringify(map.document)]);
      }
      await persistTopology(query, map.id, document);
      await map.update({ document, revision: map.revision + 1 }, { transaction });
      await this.audit.log({ userId: user.id, action: 'NETWORK_UPDATED', entity: 'NetworkMap', entityId: map.id,
        metadata: { revision: map.revision } }, transaction);
      return map;
    });
  }
}
