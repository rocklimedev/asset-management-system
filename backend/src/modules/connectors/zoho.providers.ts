import { Injectable } from '@nestjs/common';
import { ZohoAuthService } from '../zoho-auth/zoho-auth.service';
import { ZohoFailure } from '../zoho-auth/zoho-token.service';
import { zohoConfig } from '../zoho-auth/zoho-oauth.config';
import { ZohoHttpService } from './zoho-http.service';
import { IntegrationStore } from './integration.store';

export interface Connector {
  readonly provider: string;
  getCapabilities(): readonly string[];
  connect(actorId: string): Promise<unknown>;
  disconnect(actorId: string): Promise<unknown>;
  getStatus(): Promise<unknown>;
  testConnection(): Promise<unknown>;
}
export interface MailIdentity {
  id: string;
  userId: string;
  email: string;
  enabled: boolean;
}

@Injectable()
export class ZohoMailConnector implements Connector {
  readonly provider = 'zoho-mail';
  constructor(
    private readonly http: ZohoHttpService,
    private readonly auth: ZohoAuthService,
    private readonly store: IntegrationStore,
  ) {}
  getCapabilities() {
    return ['mail.lookup', 'mail.create', 'mail.send'] as const;
  }
  connect(actorId: string) {
    return this.auth.authorize(actorId);
  }
  async sendWelcome(email: string, name: string, channels: string[]) {
    const accountId = process.env.ZOHO_WELCOME_ACCOUNT_ID || '';
    const fromAddress = process.env.ZOHO_WELCOME_FROM || '';
    if (!/^\d+$/.test(accountId) || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(fromAddress))
      throw new ZohoFailure('WELCOME_SENDER_NOT_CONFIGURED');
    const result = await this.http.request(
      this.provider,
      `/api/accounts/${accountId}/messages`,
      'POST',
      {
        fromAddress,
        toAddress: email,
        subject: 'Welcome to the team',
        mailFormat: 'plaintext',
        content: `Hi ${name},\n\nWelcome to the team! Your company email is ${email}.\n\nSign in to Zoho Mail at ${zohoConfig().mail} and Zoho Cliq at ${zohoConfig().cliq}.\n${channels.length ? `\nYour team channels: ${channels.join(', ')}.\n` : ''}\nIT will share your initial sign-in details through a separate secure channel. Change your temporary password on first sign-in and set up multi-factor authentication.\n\nIf you need help, contact your manager or IT team.`,
      },
    );
    if (!result.data?.messageId) throw new ZohoFailure('WELCOME_DELIVERY_UNCONFIRMED');
  }
  disconnect(actorId: string) {
    return this.auth.disconnect(actorId);
  }
  getStatus() {
    return this.auth.status();
  }
  private base() {
    const org = zohoConfig().organizationId;
    if (!/^\d+$/.test(org)) throw new ZohoFailure('ORGANIZATION_NOT_CONFIGURED');
    return `/api/organization/${org}/accounts`;
  }
  async lookup(email: string): Promise<MailIdentity | null> {
    let response: any;
    try {
      response = await this.http.request(
        this.provider,
        `${this.base()}/${encodeURIComponent(email)}`,
      );
    } catch (error) {
      if (error instanceof ZohoFailure && error.code === 'NOT_FOUND') return null;
      throw error;
    }
    const user = response.data;
    if (!user || !user.accountId || !user.zuid || typeof user.primaryEmailAddress !== 'string')
      throw new ZohoFailure('INVALID_MAIL_RESPONSE');
    if (user.primaryEmailAddress.toLowerCase() !== email.toLowerCase())
      throw new ZohoFailure('MAIL_IDENTITY_MISMATCH');
    return {
      id: String(user.accountId),
      userId: String(user.zuid),
      email: user.primaryEmailAddress.toLowerCase(),
      enabled: user.enabled === true && user.mailboxStatus === 'enabled',
    };
  }
  async create(email: string, name: string, password: string) {
    const [firstName, ...rest] = name.trim().split(/\s+/);
    const result = await this.http.request(this.provider, this.base(), 'POST', {
      primaryEmailAddress: email,
      password,
      firstName,
      lastName: rest.join(' '),
      displayName: name,
      role: 'member',
      oneTimePassword: true,
    });
    if (!result.data?.accountId || !result.data?.zuid)
      throw new ZohoFailure('INVALID_MAIL_CREATE_RESPONSE', true);
    const verified = await this.lookup(email);
    if (!verified || verified.id !== String(result.data.accountId) || !verified.enabled)
      throw new ZohoFailure('MAIL_VERIFICATION_PENDING', true);
    return verified;
  }
  async testConnection() {
    const response = await this.http.request(this.provider, `${this.base()}?start=0&limit=1`);
    if (response.data === undefined) throw new ZohoFailure('INVALID_MAIL_RESPONSE');
    const identity = await this.http.request(this.provider, '/api/accounts');
    if (!Array.isArray(identity.data)) throw new ZohoFailure('INVALID_MAIL_IDENTITY_RESPONSE');
    const account = identity.data.find(
      (a: any) => a.type === 'ZOHO_ACCOUNT' && typeof a.primaryEmailAddress === 'string',
    );
    if (account)
      await this.store.run("UPDATE zoho_connections SET accountEmail=:email WHERE id='zoho'", {
        email: account.primaryEmailAddress,
      });
    await this.store.run("UPDATE zoho_connections SET lastHealthCheckAt=NOW() WHERE id='zoho'");
    return { provider: this.provider, healthy: true };
  }
}

function validBot(value: any): any {
  if (
    !value ||
    typeof value !== 'object' ||
    (typeof value.id !== 'string' && typeof value.id !== 'number') ||
    typeof value.name !== 'string'
  )
    throw new ZohoFailure('INVALID_BOT_RESPONSE');
  return value;
}

@Injectable()
export class ZohoCliqConnector implements Connector {
  readonly provider = 'zoho-cliq';
  constructor(
    private readonly http: ZohoHttpService,
    private readonly auth: ZohoAuthService,
  ) {}
  getCapabilities() {
    return [
      'users.lookup',
      'users.create',
      'channels.list',
      'channels.members',
      'channels.add',
      'channels.remove',
      'bots.list',
      'bots.details',
    ] as const;
  }
  connect(actorId: string) {
    return this.auth.authorize(actorId);
  }
  disconnect(actorId: string) {
    return this.auth.disconnect(actorId);
  }
  getStatus() {
    return this.auth.status();
  }
  async lookup(email: string): Promise<{ id: string; email: string; active: boolean } | null> {
    let result: any;
    try {
      result = await this.http.request(this.provider, `/api/v2/users/${encodeURIComponent(email)}`);
    } catch (error) {
      if (error instanceof ZohoFailure && error.code === 'NOT_FOUND') return null;
      throw error;
    }
    const user = result.data;
    if (!user?.id || typeof user.email_id !== 'string')
      throw new ZohoFailure('INVALID_CLIQ_RESPONSE');
    if (
      user.email_id.toLowerCase() !== email.toLowerCase() ||
      String(user.zoid) !== zohoConfig().organizationId
    )
      throw new ZohoFailure('CLIQ_ORGANIZATION_OR_IDENTITY_MISMATCH');
    return {
      id: String(user.id),
      email: user.email_id.toLowerCase(),
      active: user.status === 'active',
    };
  }
  async create(email: string, name: string) {
    if (process.env.ZOHO_CLIQ_ALLOW_CREATE !== 'true')
      throw new ZohoFailure('CLIQ_ADMIN_INVITATION_REQUIRED');
    const [first_name, ...last] = name.split(/\s+/);
    const result = await this.http.request(this.provider, '/api/v2/users', 'POST', {
      users: [{ email_id: email, first_name, last_name: last.join(' ') }],
    });
    if (!Array.isArray(result.data?.success_users) || !result.data.success_users.includes(email))
      throw new ZohoFailure('CLIQ_INVITATION_REJECTED');
    // Success_users means invitation accepted by API, not an active user.
    return this.lookup(email);
  }
  channels() {
    return this.http.paged('/api/v2/channels?limit=100', 'channels');
  }
  details(id: string) {
    return this.http.request(this.provider, `/api/v2/channels/${encodeURIComponent(id)}`);
  }
  members(id: string) {
    return this.http.paged(`/api/v2/channels/${encodeURIComponent(id)}/members`, 'members');
  }
  async ensureMember(channelId: string, userId: string) {
    if ((await this.members(channelId)).some((m) => String(m.user_id) === userId)) return;
    await this.http.request(
      this.provider,
      `/api/v2/channels/${encodeURIComponent(channelId)}/members`,
      'POST',
      { user_ids: [userId] },
    );
    if (!(await this.members(channelId)).some((m) => String(m.user_id) === userId))
      throw new ZohoFailure('MEMBERSHIP_VERIFICATION_PENDING', true);
  }
  async removeMember(channelId: string, userId: string) {
    if (!(await this.members(channelId)).some((m) => String(m.user_id) === userId)) return;
    await this.http.request(
      this.provider,
      `/api/v2/channels/${encodeURIComponent(channelId)}/members/${encodeURIComponent(userId)}`,
      'DELETE',
    );
    if ((await this.members(channelId)).some((m) => String(m.user_id) === userId))
      throw new ZohoFailure('REMOVAL_VERIFICATION_PENDING', true);
  }
  /** Cliq v3 Bots API: GET /api/v3/bots, cursor paginated with next_token (scope ZohoCliq.Bots.READ). */
  async bots(): Promise<any[]> {
    const items: any[] = [];
    const seen = new Set<string>();
    let next: string | undefined;
    for (let page = 0; page < 100; page++) {
      const query = new URLSearchParams({ limit: '50' });
      if (next) query.set('next_token', next);
      const response = await this.http.request(this.provider, `/api/v3/bots?${query}`);
      if (!Array.isArray(response.data)) throw new ZohoFailure('INVALID_BOT_RESPONSE');
      for (const bot of response.data) items.push(validBot(bot));
      if (!response.data.length || typeof response.next_token !== 'string' || !response.next_token)
        return items;
      if (seen.has(response.next_token)) throw new ZohoFailure('INVALID_PAGINATION');
      seen.add(response.next_token);
      next = response.next_token;
    }
    throw new ZohoFailure('PAGINATION_LIMIT');
  }
  /** Cliq v3: GET /api/v3/bots/{BOT_ID}. The id must be the numeric Cliq bot id. */
  async bot(id: string): Promise<any> {
    const response = await this.http.request(
      this.provider,
      `/api/v3/bots/${encodeURIComponent(id)}`,
    );
    return validBot(response.data);
  }
  async testConnection() {
    await this.http.request(this.provider, '/api/v2/channels?limit=1');
    return { provider: this.provider, healthy: true };
  }
}
