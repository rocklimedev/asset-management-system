import { Module, Injectable, Controller, Get, Post, Patch, Delete, Body, Param, Header, NotFoundException, ServiceUnavailableException, ParseUUIDPipe } from '@nestjs/common';
import { SequelizeModule, InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Employee } from '../organisation/models/employees.model';
import { AuditModule } from '../audit/audit.module';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, AuthUser } from '../../common/decorator/current-user.decorator';
import { RequirePermissions } from '../../common/decorator/roles.decorator';
import { Credential } from './credential.model';
import { CredentialCrypto } from './credential-crypto';
import { CreateCredentialDto, UpdateCredentialDto } from './credential.dto';

@Injectable()
export class CredentialsService {
  constructor(@InjectModel(Credential) private model: typeof Credential, @InjectModel(Employee) private employees: typeof Employee, private config: ConfigService, private audit: AuditService) {}
  private crypto() {
    try { return new CredentialCrypto(this.config.get<string>('CREDENTIAL_ENCRYPTION_KEY') || ''); }
    catch { throw new ServiceUnavailableException('Credential vault encryption is not configured.'); }
  }
  private async employee(id: string) { if (!await this.employees.findByPk(id)) throw new NotFoundException('Employee not found.'); }
  private async record(employeeId: string, id: string) {
    const row = await this.model.findOne({ where: { employeeId, id } });
    if (!row) throw new NotFoundException('Credential not found.');
    return row;
  }
  private summary(row: Credential) {
    return { id: row.id, employeeId: row.employeeId, title: row.title, category: row.category, purpose: row.purpose, systemLabel: row.systemLabel, username: this.crypto().decrypt(row.encryptedUsername, `${row.id}:username`), updatedAt: row.updatedAt };
  }
  async list(employeeId: string) {
    this.crypto(); await this.employee(employeeId);
    return (await this.model.findAll({ where: { employeeId }, order: [['category', 'ASC'], ['title', 'ASC']] })).map(row => this.summary(row));
  }
  async create(employeeId: string, dto: CreateCredentialDto, user: AuthUser) {
    await this.employee(employeeId);
    const id = randomUUID(), crypto = this.crypto();
    const { username, password, ...metadata } = dto;
    return this.model.sequelize!.transaction(async transaction => {
      const row = await this.model.create({ ...metadata, id, employeeId, encryptedUsername: crypto.encrypt(username, `${id}:username`), encryptedPassword: crypto.encrypt(password, `${id}:password`) } as Credential, { transaction, logging: false });
      await this.audit.log({ userId: user.id, action: 'CREDENTIAL_CREATED', entity: 'Credential', entityId: id }, transaction);
      return this.summary(row);
    });
  }
  async update(employeeId: string, id: string, dto: UpdateCredentialDto, user: AuthUser) {
    const row = await this.record(employeeId, id), crypto = this.crypto();
    const { username, password, ...metadata } = dto;
    return this.model.sequelize!.transaction(async transaction => {
      await row.update({ ...metadata, ...(username !== undefined ? { encryptedUsername: crypto.encrypt(username, `${id}:username`) } : {}), ...(password !== undefined ? { encryptedPassword: crypto.encrypt(password, `${id}:password`) } : {}) }, { transaction, logging: false });
      await this.audit.log({ userId: user.id, action: 'CREDENTIAL_UPDATED', entity: 'Credential', entityId: id }, transaction);
      return this.summary(row);
    });
  }
  async reveal(employeeId: string, id: string, user: AuthUser) {
    const row = await this.record(employeeId, id);
    const password = this.crypto().decrypt(row.encryptedPassword, `${id}:password`);
    await this.audit.log({ userId: user.id, action: 'CREDENTIAL_REVEALED', entity: 'Credential', entityId: id });
    return { password };
  }
  async remove(employeeId: string, id: string, user: AuthUser) {
    const row = await this.record(employeeId, id);
    await this.model.sequelize!.transaction(async transaction => {
      await row.destroy({ transaction });
      await this.audit.log({ userId: user.id, action: 'CREDENTIAL_DELETED', entity: 'Credential', entityId: id }, transaction);
    });
    return { success: true };
  }
}

@Controller('employees/:employeeId/credentials')
@RequirePermissions('credentials.read')
export class CredentialsController {
  constructor(private service: CredentialsService) {}
  @Get() @Header('Cache-Control', 'no-store')
  list(@Param('employeeId', ParseUUIDPipe) employeeId: string) { return this.service.list(employeeId); }
  @Post() @RequirePermissions('credentials.read', 'credentials.manage') @Header('Cache-Control', 'no-store')
  create(@Param('employeeId', ParseUUIDPipe) employeeId: string, @Body() dto: CreateCredentialDto, @CurrentUser() user: AuthUser) { return this.service.create(employeeId, dto, user); }
  @Patch(':id') @RequirePermissions('credentials.read', 'credentials.manage') @Header('Cache-Control', 'no-store')
  update(@Param('employeeId', ParseUUIDPipe) employeeId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCredentialDto, @CurrentUser() user: AuthUser) { return this.service.update(employeeId, id, dto, user); }
  @Post(':id/reveal') @RequirePermissions('credentials.read', 'credentials.reveal') @Header('Cache-Control', 'no-store')
  reveal(@Param('employeeId', ParseUUIDPipe) employeeId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) { return this.service.reveal(employeeId, id, user); }
  @Delete(':id') @RequirePermissions('credentials.read', 'credentials.manage')
  remove(@Param('employeeId', ParseUUIDPipe) employeeId: string, @Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) { return this.service.remove(employeeId, id, user); }
}

@Module({ imports: [SequelizeModule.forFeature([Credential, Employee]), AuditModule], controllers: [CredentialsController], providers: [CredentialsService] })
export class CredentialsModule {}
