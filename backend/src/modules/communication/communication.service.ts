import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import { IntegrationStore } from '../connectors/integration.store';
import { ConnectorRegistry } from '../connectors/connectors.module';
import { jsonValue } from '../zoho-auth/zoho-auth.service';
import { ZohoFailure } from '../zoho-auth/zoho-token.service';
import {
  ActivationDto,
  AssignProfileDto,
  ProfileDto,
  ProvisionDto,
  UpdateProfileDto,
} from './communication.dto';
import { availableEmail } from './email-policy';

@Injectable()
export class CommunicationService {
  constructor(
    private readonly store: IntegrationStore,
    private readonly registry: ConnectorRegistry,
  ) {}
  async employee(id: string) {
    const employee = await this.store.one(
      'SELECT id,name,status FROM employees WHERE id=:id AND deletedAt IS NULL',
      { id },
    );
    if (!employee) throw new NotFoundException('Employee not found');
    if (employee.status !== 'ACTIVE')
      throw new BadRequestException('Only active employees can be provisioned');
    return employee;
  }
  profiles() {
    return this.store.rows('SELECT * FROM communication_profiles ORDER BY name');
  }
  async profile(id: string): Promise<Record<string, any> & { channelIds: string[] }> {
    const row = await this.store.one('SELECT * FROM communication_profiles WHERE id=:id', { id });
    if (!row) throw new NotFoundException('Communication profile not found');
    return { ...row, channelIds: jsonValue<string[]>(row.channelIds) };
  }
  async validateChannels(ids: string[]) {
    if (!ids.length) return;
    const rows = await this.store.rows(
      'SELECT id FROM communication_channels WHERE id IN (:ids) AND isActive=1',
      { ids },
    );
    if (rows.length !== ids.length) throw new BadRequestException('Unknown or inactive channel');
  }
  async saveProfile(id: string | undefined, dto: ProfileDto | UpdateProfileDto, actorId: string) {
    return this.store.locked('communication:profiles', async () => {
      const old = id ? await this.profile(id) : undefined;
      const value = { ...old, ...dto } as ProfileDto;
      await this.validateChannels(value.channelIds);
      const duplicate = await this.store.one(
        'SELECT id FROM communication_profiles WHERE code=:code AND id<>:id',
        { code: value.code, id: id || '' },
      );
      if (duplicate) throw new ConflictException('Profile code already exists');
      const profileId = id || randomUUID();
      await this.store.run(
        `INSERT INTO communication_profiles (id,name,code,description,isActive,channelIds,createdAt,updatedAt)
        VALUES (:id,:name,:code,:description,:active,:channels,NOW(),NOW())
        ON DUPLICATE KEY UPDATE name=VALUES(name),code=VALUES(code),description=VALUES(description),isActive=VALUES(isActive),channelIds=VALUES(channelIds),updatedAt=NOW()`,
        {
          id: profileId,
          name: value.name,
          code: value.code,
          description: value.description || null,
          active: value.isActive ?? true,
          channels: JSON.stringify(value.channelIds),
        },
      );
      await this.store.log(
        id ? 'PROFILE_UPDATED' : 'PROFILE_CREATED',
        profileId,
        'COMPLETED',
        actorId,
      );
      return this.profile(profileId);
    });
  }
  async deleteProfile(id: string, actorId: string) {
    return this.store.locked('communication:profiles', async () => {
      await this.profile(id);
      if (
        await this.store.one(
          'SELECT employeeId FROM employee_communication_plans WHERE profileId=:id LIMIT 1',
          { id },
        )
      )
        throw new ConflictException('Profile is assigned to employees; reassign them first');
      await this.store.run('DELETE FROM communication_profiles WHERE id=:id', { id });
      await this.store.log('PROFILE_DELETED', id, 'COMPLETED', actorId);
      return { deleted: true };
    });
  }
  channels() {
    return this.store.rows('SELECT * FROM communication_channels ORDER BY channelName');
  }
  async channel(id: string) {
    const channel = await this.store.one('SELECT * FROM communication_channels WHERE id=:id', {
      id,
    });
    if (!channel) throw new NotFoundException('Channel not found');
    return channel;
  }
  async syncChannels(actorId: string) {
    return this.store.locked('communication:channels', async () => {
      const channels = await this.registry.cliq.channels();
      for (const channel of channels) {
        if (typeof channel.channel_id !== 'string' || typeof channel.name !== 'string')
          throw new ZohoFailure('INVALID_CHANNEL_RESPONSE');
        await this.store.run(
          `INSERT INTO communication_channels (id,provider,externalChannelId,channelName,channelType,isActive,updatedAt)
          VALUES (:id,'zoho-cliq',:external,:name,:type,:active,NOW()) ON DUPLICATE KEY UPDATE
          channelName=VALUES(channelName),channelType=VALUES(channelType),isActive=VALUES(isActive),updatedAt=NOW()`,
          {
            id: randomUUID(),
            external: channel.channel_id,
            name: channel.name,
            type: channel.level || 'unknown',
            active: channel.status === 'created',
          },
        );
      }
      const externalIds = channels.map((c) => c.channel_id);
      await this.store.run(
        `UPDATE communication_channels SET isActive=0,updatedAt=NOW() WHERE provider='zoho-cliq'
        ${externalIds.length ? 'AND externalChannelId NOT IN (:ids)' : ''}`,
        externalIds.length ? { ids: externalIds } : {},
      );
      await this.store.run("UPDATE zoho_connections SET lastSyncAt=NOW() WHERE id='zoho'");
      await this.store.log('CHANNEL_DIRECTORY_SYNC', 'zoho', 'COMPLETED', actorId);
      return { items: await this.channels() };
    });
  }
  async members(id: string) {
    return { items: await this.registry.cliq.members((await this.channel(id)).externalChannelId) };
  }
  async details(id: string) {
    return this.registry.cliq.details((await this.channel(id)).externalChannelId);
  }
  async resolvePlan(dto: AssignProfileDto) {
    const profile = dto.profileId ? await this.profile(dto.profileId) : undefined;
    if (profile && !profile.isActive) throw new BadRequestException('Profile is inactive');
    const ids = [...new Set([...(profile?.channelIds || []), ...(dto.addChannelIds || [])])].filter(
      (id) => !dto.removeChannelIds?.includes(id),
    );
    await this.validateChannels(ids);
    return ids;
  }
  async preview(employeeId: string, dto: AssignProfileDto) {
    await this.employee(employeeId);
    const ids = await this.resolvePlan(dto);
    return {
      employeeId,
      channelIds: ids,
      channels: ids.length
        ? await this.store.rows('SELECT * FROM communication_channels WHERE id IN (:ids)', { ids })
        : [],
    };
  }
  async assign(employeeId: string, dto: AssignProfileDto, actorId: string) {
    return this.store.locked('communication:profiles', () =>
      this.store.locked(`employee:${employeeId}`, async () => {
        const preview = await this.preview(employeeId, dto);
        await this.store.atomic([
          {
            sql: `INSERT INTO employee_communication_plans (employeeId,profileId,channelIds,updatedAt)
        VALUES (:employeeId,:profile,:channels,NOW()) ON DUPLICATE KEY UPDATE profileId=VALUES(profileId),channelIds=VALUES(channelIds),updatedAt=NOW()`,
            values: {
              employeeId,
              profile: dto.profileId || null,
              channels: JSON.stringify(preview.channelIds),
            },
          },
          {
            sql: "UPDATE onboarding_tasks SET status='PENDING',lastError=NULL WHERE employeeId=:employeeId AND taskType='CHANNELS'",
            values: { employeeId },
          },
          {
            sql: "UPDATE onboarding_workflows SET status='PENDING',completedAt=NULL WHERE employeeId=:employeeId",
            values: { employeeId },
          },
        ]);
        await this.store.log('PROFILE_ASSIGNED', employeeId, 'COMPLETED', actorId);
        return preview;
      }),
    );
  }
  async status(employeeId: string) {
    if (
      !(await this.store.one(
        'SELECT id FROM employees WHERE id=:employeeId AND deletedAt IS NULL',
        { employeeId },
      ))
    )
      throw new NotFoundException('Employee not found');
    return {
      employeeId,
      account:
        (await this.store.one(
          'SELECT employeeId,email,mailAccountId,mailUserId,cliqUserId,activationStatus FROM employee_communication_accounts WHERE employeeId=:employeeId',
          { employeeId },
        )) || null,
      plan:
        (await this.store.one(
          'SELECT * FROM employee_communication_plans WHERE employeeId=:employeeId',
          { employeeId },
        )) || null,
      workflow:
        (await this.store.one('SELECT * FROM onboarding_workflows WHERE employeeId=:employeeId', {
          employeeId,
        })) || null,
      tasks: await this.store.rows(
        'SELECT * FROM onboarding_tasks WHERE employeeId=:employeeId ORDER BY taskOrder',
        { employeeId },
      ),
      assignments: await this.store.rows(
        'SELECT * FROM employee_communication_assignments WHERE employeeId=:employeeId',
        { employeeId },
      ),
    };
  }
  logs(employeeId: string) {
    return this.store.rows(
      'SELECT * FROM integration_logs WHERE entityId=:employeeId ORDER BY createdAt DESC LIMIT 200',
      { employeeId },
    );
  }

  private async initialize(employeeId: string, actorId: string) {
    await this.store.run(
      `INSERT IGNORE INTO onboarding_workflows (id,employeeId,status,createdBy,startedAt)
      VALUES (:id,:employeeId,'PENDING',:actorId,NOW())`,
      { id: randomUUID(), employeeId, actorId },
    );
    for (const [index, type] of ['MAIL', 'CLIQ', 'CHANNELS', 'ACTIVATION'].entries()) {
      await this.store.run(
        `INSERT IGNORE INTO onboarding_tasks (id,employeeId,taskType,taskOrder,status,attemptCount)
        VALUES (:id,:employeeId,:type,:index,'PENDING',0)`,
        { id: randomUUID(), employeeId, type, index },
      );
    }
  }
  private async task(
    employeeId: string,
    type: string,
    actorId: string,
    action: () => Promise<void>,
  ) {
    const task = await this.store.one(
      'SELECT status FROM onboarding_tasks WHERE employeeId=:employeeId AND taskType=:type',
      { employeeId, type },
    );
    if (task?.status === 'COMPLETED') return true;
    await this.store.run(
      `UPDATE onboarding_tasks SET status='IN_PROGRESS',attemptCount=attemptCount+1,startedAt=NOW(),lastError=NULL
      WHERE employeeId=:employeeId AND taskType=:type`,
      { employeeId, type },
    );
    await this.store.log(type, employeeId, 'IN_PROGRESS', actorId);
    try {
      await action();
      await this.store.run(
        "UPDATE onboarding_tasks SET status='COMPLETED',completedAt=NOW() WHERE employeeId=:employeeId AND taskType=:type",
        { employeeId, type },
      );
      await this.store.log(type, employeeId, 'COMPLETED', actorId);
      return true;
    } catch (error) {
      const failure = error instanceof ZohoFailure ? error : null;
      const status = failure?.retryable
        ? 'RETRY_REQUIRED'
        : failure
          ? 'REQUIRES_MANUAL_ACTION'
          : 'FAILED';
      // Never persist arbitrary exception text: external errors can echo submitted secrets.
      const code = failure?.code || 'VALIDATION_OR_STORAGE_FAILURE';
      await this.store.run(
        'UPDATE onboarding_tasks SET status=:status,lastError=:code WHERE employeeId=:employeeId AND taskType=:type',
        { employeeId, type, status, code },
      );
      await this.store.run(
        'UPDATE onboarding_workflows SET status=:status WHERE employeeId=:employeeId',
        { employeeId, status },
      );
      await this.store.log(type, employeeId, status, actorId, code);
      return false;
    }
  }
  async provision(
    employeeId: string,
    dto: ProvisionDto,
    actorId: string,
    until = 'ALL',
    onlyStep?: string,
    reverify = false,
  ) {
    return this.store.locked('communication:mail-allocation', () =>
      this.store.locked(`employee:${employeeId}`, async () => {
        const employee = await this.employee(employeeId);
        // Idempotency identifies intent, never includes temporary credentials.
        const hash = createHash('sha256')
          .update(
            JSON.stringify({
              employeeId,
              email: dto.email || null,
              domain: dto.domain || null,
              until,
              onlyStep: onlyStep || null,
              reverify,
            }),
          )
          .digest('hex');
        const existing = await this.store.one(
          'SELECT intentHash FROM communication_requests WHERE idempotencyKey=:key',
          { key: dto.idempotencyKey },
        );
        if (existing && existing.intentHash !== hash)
          throw new ConflictException('Idempotency key already used for different input');
        await this.store.run(
          `INSERT IGNORE INTO communication_requests (idempotencyKey,employeeId,intentHash,createdAt) VALUES (:key,:employeeId,:hash,NOW())`,
          { key: dto.idempotencyKey, employeeId, hash },
        );
        await this.initialize(employeeId, actorId);
        if (reverify && onlyStep === 'CHANNELS')
          await this.store.run(
            "UPDATE onboarding_tasks SET status='PENDING' WHERE employeeId=:employeeId AND taskType='CHANNELS'",
            { employeeId },
          );
        await this.store.run(
          "UPDATE onboarding_workflows SET status='IN_PROGRESS',completedAt=NULL WHERE employeeId=:employeeId",
          { employeeId },
        );
        if (onlyStep) {
          const dependencies: Record<string, string[]> = {
            MAIL: [],
            CLIQ: ['MAIL'],
            CHANNELS: ['MAIL', 'CLIQ'],
            ACTIVATION: ['MAIL'],
          };
          const completed = await this.store.rows(
            "SELECT taskType FROM onboarding_tasks WHERE employeeId=:employeeId AND status='COMPLETED'",
            { employeeId },
          );
          if (
            (dependencies[onlyStep] || []).some(
              (type) => !completed.some((t) => t.taskType === type),
            )
          )
            throw new ConflictException('Complete prerequisite steps first');
        }
        if (!onlyStep || onlyStep === 'MAIL') {
          if (
            !(await this.task(employeeId, 'MAIL', actorId, () => this.provisionMail(employee, dto)))
          )
            return this.status(employeeId);
        }
        if (until === 'MAIL') return this.finish(employeeId);
        if (!onlyStep || onlyStep === 'CLIQ') {
          if (!(await this.task(employeeId, 'CLIQ', actorId, () => this.provisionCliq(employee))))
            return this.status(employeeId);
        }
        if (until === 'CLIQ') return this.finish(employeeId);
        if (!onlyStep || onlyStep === 'CHANNELS') {
          if (
            !(await this.task(employeeId, 'CHANNELS', actorId, () =>
              this.assignChannels(employeeId),
            ))
          )
            return this.status(employeeId);
        }
        if (!onlyStep || onlyStep === 'ACTIVATION') {
          await this.task(employeeId, 'ACTIVATION', actorId, async () => {
            const account = await this.account(employeeId);
            if (account.activationStatus !== 'COMPLETED')
              throw new ZohoFailure('ADMIN_SECURE_ACTIVATION_REQUIRED');
          });
        }
        return this.finish(employeeId);
      }),
    );
  }
  private async account(employeeId: string) {
    const account = await this.store.one(
      'SELECT * FROM employee_communication_accounts WHERE employeeId=:employeeId',
      { employeeId },
    );
    if (!account) throw new ZohoFailure('MAIL_ACCOUNT_REQUIRED');
    return account;
  }
  private async provisionMail(employee: Record<string, any>, dto: ProvisionDto) {
    let account = await this.store.one(
      'SELECT * FROM employee_communication_accounts WHERE employeeId=:id',
      { id: employee.id },
    );
    if (!account) {
      const email = await availableEmail(
        employee.name,
        dto.domain,
        dto.email,
        async (candidate) => {
          if (
            await this.store.one(
              'SELECT employeeId FROM employee_communication_accounts WHERE email=:candidate',
              { candidate },
            )
          )
            return true;
          if (
            await this.store.one('SELECT id FROM employees WHERE email=:candidate AND id<>:id', {
              candidate,
              id: employee.id,
            })
          )
            return true;
          return !!(await this.registry.mail.lookup(candidate));
        },
      );
      await this.store.run(
        `INSERT INTO employee_communication_accounts (employeeId,email,activationStatus,createAttempted,createdAt)
        VALUES (:id,:email,'REQUIRES_MANUAL_ACTION',0,NOW())`,
        { id: employee.id, email },
      );
      account = await this.account(employee.id);
    }
    if (dto.email && dto.email.toLowerCase() !== account.email)
      throw new ZohoFailure('EMAIL_ALREADY_RESERVED');
    let remote = await this.registry.mail.lookup(account.email);
    if (remote && !account.mailAccountId && !account.createAttempted)
      throw new ZohoFailure('EMAIL_CONFLICT_REQUIRES_RECONCILIATION');
    if (!remote) {
      if (account.mailAccountId || account.createAttempted)
        throw new ZohoFailure('MAIL_CREATION_AMBIGUOUS_RECONCILE_IN_ADMIN_CONSOLE');
      if (!dto.temporaryPassword) throw new ZohoFailure('TEMPORARY_PASSWORD_REQUIRED');
      await this.store.run(
        'UPDATE employee_communication_accounts SET createAttempted=1 WHERE employeeId=:id',
        { id: employee.id },
      );
      remote = await this.registry.mail.create(account.email, employee.name, dto.temporaryPassword);
    }
    if (!remote.enabled) throw new ZohoFailure('MAIL_VERIFICATION_PENDING', true);
    if (account.mailAccountId && remote.id !== account.mailAccountId)
      throw new ZohoFailure('MAIL_IDENTITY_CHANGED');
    await this.store.run(
      `UPDATE employee_communication_accounts SET mailAccountId=:mailId,mailUserId=:userId WHERE employeeId=:id`,
      {
        id: employee.id,
        mailId: remote.id,
        userId: remote.userId,
      },
    );
  }
  private async provisionCliq(employee: Record<string, any>) {
    const account = await this.account(employee.id);
    if (!account.mailAccountId) throw new ZohoFailure('MAIL_ACCOUNT_REQUIRED');
    let user = await this.registry.cliq.lookup(account.email);
    if (!user) {
      if (account.cliqCreateAttempted)
        throw new ZohoFailure('CLIQ_INVITATION_PENDING_CHECK_ADMIN_CONSOLE');
      if (process.env.ZOHO_CLIQ_ALLOW_CREATE !== 'true')
        throw new ZohoFailure('CLIQ_ADMIN_INVITATION_REQUIRED');
      await this.store.run(
        'UPDATE employee_communication_accounts SET cliqCreateAttempted=1 WHERE employeeId=:id',
        { id: employee.id },
      );
      user = await this.registry.cliq.create(account.email, employee.name);
    }
    if (!user?.active) throw new ZohoFailure('CLIQ_ACTIVATION_PENDING');
    if (account.cliqUserId && account.cliqUserId !== user.id)
      throw new ZohoFailure('CLIQ_IDENTITY_CHANGED');
    await this.store.run(
      'UPDATE employee_communication_accounts SET cliqUserId=:userId WHERE employeeId=:id',
      { id: employee.id, userId: user.id },
    );
  }
  private async assignChannels(employeeId: string) {
    const account = await this.account(employeeId);
    if (!account.cliqUserId) throw new ZohoFailure('CLIQ_ACCOUNT_REQUIRED');
    const plan = await this.store.one(
      'SELECT channelIds FROM employee_communication_plans WHERE employeeId=:employeeId',
      { employeeId },
    );
    if (!plan) throw new ZohoFailure('COMMUNICATION_PROFILE_REQUIRED');
    const ids = jsonValue<string[]>(plan.channelIds);
    await this.validateChannels(ids);
    for (const id of ids) {
      const channel = await this.channel(id);
      await this.store.run(
        `INSERT INTO employee_communication_assignments (id,employeeId,channelId,status)
        VALUES (:id,:employeeId,:channelId,'PENDING') ON DUPLICATE KEY UPDATE status='IN_PROGRESS'`,
        { id: randomUUID(), employeeId, channelId: id },
      );
      try {
        await this.registry.cliq.ensureMember(channel.externalChannelId, account.cliqUserId);
        await this.store.run(
          `UPDATE employee_communication_assignments SET status='COMPLETED',assignedAt=COALESCE(assignedAt,NOW()),verifiedAt=NOW(),lastError=NULL
          WHERE employeeId=:employeeId AND channelId=:id`,
          { employeeId, id },
        );
      } catch (error) {
        await this.store.run(
          "UPDATE employee_communication_assignments SET status='RETRY_REQUIRED',lastError=:code WHERE employeeId=:employeeId AND channelId=:id",
          {
            employeeId,
            id,
            code: error instanceof ZohoFailure ? error.code : 'CHANNEL_FAILURE',
          },
        );
        throw error;
      }
    }
  }
  async removeMembership(employeeId: string, channelId: string, actorId: string) {
    return this.store.locked(`employee:${employeeId}`, async () => {
      await this.employee(employeeId);
      const account = await this.account(employeeId);
      if (!account.cliqUserId) throw new ConflictException('Cliq user has not been provisioned');
      const plan = await this.store.one(
        'SELECT channelIds FROM employee_communication_plans WHERE employeeId=:employeeId',
        { employeeId },
      );
      if (plan && jsonValue<string[]>(plan.channelIds).includes(channelId))
        throw new ConflictException('Remove channel from employee plan before removing membership');
      await this.registry.cliq.removeMember(
        (await this.channel(channelId)).externalChannelId,
        account.cliqUserId,
      );
      await this.store.run(
        "UPDATE employee_communication_assignments SET status='REMOVED',verifiedAt=NOW() WHERE employeeId=:employeeId AND channelId=:channelId",
        { employeeId, channelId },
      );
      await this.store.log('CHANNEL_MEMBERSHIP_REMOVED', employeeId, 'COMPLETED', actorId);
      return this.status(employeeId);
    });
  }
  async confirmActivation(employeeId: string, _dto: ActivationDto, actorId: string) {
    return this.store.locked(`employee:${employeeId}`, async () => {
      const account = await this.account(employeeId);
      if (!account.mailAccountId) throw new ConflictException('Provision Mail first');
      await this.store.run(
        "UPDATE employee_communication_accounts SET activationStatus='COMPLETED' WHERE employeeId=:employeeId",
        { employeeId },
      );
      await this.store.run(
        "UPDATE onboarding_tasks SET status='COMPLETED',completedAt=NOW(),lastError=NULL WHERE employeeId=:employeeId AND taskType='ACTIVATION'",
        { employeeId },
      );
      await this.store.log('ACTIVATION_ADMIN_ATTESTATION', employeeId, 'COMPLETED', actorId);
      return this.finish(employeeId);
    });
  }
  private async finish(employeeId: string) {
    const tasks = await this.store.rows(
      'SELECT status FROM onboarding_tasks WHERE employeeId=:employeeId',
      { employeeId },
    );
    const completed = tasks.length === 4 && tasks.every((t) => t.status === 'COMPLETED');
    const status = completed
      ? 'COMPLETED'
      : tasks.find((t) => ['FAILED', 'RETRY_REQUIRED', 'REQUIRES_MANUAL_ACTION'].includes(t.status))
          ?.status || 'PENDING';
    await this.store.run(
      'UPDATE onboarding_workflows SET status=:status,completedAt=:at WHERE employeeId=:employeeId',
      { employeeId, status, at: completed ? new Date() : null },
    );
    return this.status(employeeId);
  }
}
