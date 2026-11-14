import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { IntegrationStore } from '../connectors/integration.store';
import { ZohoTokenService } from './zoho-token.service';
import { requireOAuthConfig, zohoConfig } from './zoho-oauth.config';

export function jsonValue<T>(value: T | string): T {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

@Injectable()
export class ZohoAuthService {
  constructor(
    private readonly store: IntegrationStore,
    private readonly tokens: ZohoTokenService,
  ) {}
  async authorize(actorId: string) {
    const config = requireOAuthConfig();
    this.tokens.crypto();
    const previous = await this.store.one(
      "SELECT organizationId,dataCenter FROM zoho_connections WHERE id='zoho'",
    );
    if (
      previous?.organizationId &&
      (previous.organizationId !== config.organizationId || previous.dataCenter !== config.dc)
    ) {
      const mapping = await this.store.one(
        'SELECT employeeId FROM employee_communication_accounts LIMIT 1',
      );
      const channel = await this.store.one('SELECT id FROM communication_channels LIMIT 1');
      if (mapping || channel)
        throw new BadRequestException(
          'Existing communication records belong to another Zoho organization; migrate them explicitly before changing organization.',
        );
    }
    const state = randomBytes(32).toString('base64url');
    await this.store.run(
      `INSERT INTO zoho_oauth_states (stateHash,actorId,expiresAt,dataCenter,organizationId,scopes)
      VALUES (:hash,:actor,DATE_ADD(NOW(), INTERVAL 10 MINUTE),:dc,:org,:scopes)`,
      {
        hash: createHash('sha256').update(state).digest('hex'),
        actor: actorId,
        dc: config.dc,
        org: config.organizationId,
        scopes: JSON.stringify(config.scopes),
      },
    );
    await this.store.log('OAUTH_START', 'zoho', 'PENDING', actorId);
    const url = new URL(`${config.accounts}/oauth/v2/auth`);
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirect,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      scope: config.scopes.join(','),
      state,
    }).toString();
    return { authorizationUrl: url.toString(), expiresIn: 600 };
  }
  async callback(state?: string, code?: string, denied?: string) {
    if (!state || state.length > 256) throw new BadRequestException('Invalid OAuth state');
    return this.store.locked('zoho:auth', async () => {
      const hash = createHash('sha256').update(state).digest('hex');
      const row = await this.store.one(
        `SELECT s.* FROM zoho_oauth_states s
        JOIN users u ON u.id=s.actorId JOIN role_permissions rp ON rp.role_id=u.role_id
        JOIN permissions p ON p.id=rp.permission_id AND p.\`key\`='integrations:manage'
        WHERE s.stateHash=:hash AND s.usedAt IS NULL AND s.expiresAt>NOW() AND u.status='ACTIVE' LIMIT 1`,
        { hash },
      );
      if (!row)
        throw new BadRequestException(
          'OAuth state expired, already used, or administrator permission revoked',
        );
      await this.store.run('UPDATE zoho_oauth_states SET usedAt=NOW() WHERE stateHash=:hash', {
        hash,
      });
      const config = requireOAuthConfig();
      if (row.dataCenter !== config.dc || row.organizationId !== config.organizationId)
        throw new BadRequestException('Zoho configuration changed; restart authorization');
      if (denied || !code || code.length > 4096) {
        await this.store.log('OAUTH_CALLBACK', 'zoho', 'FAILED', row.actorId, 'CONSENT_DENIED');
        throw new BadRequestException('Zoho authorization denied or code missing');
      }
      try {
        const data = await this.tokens.tokenRequest('/oauth/v2/token', {
          grant_type: 'authorization_code',
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirect,
        });
        // Zoho may omit scope in the exchange response; retain the exact consent request.
        if (!data.scope) data.scope = jsonValue<string[]>(row.scopes).join(',');
        await this.tokens.save(data);
        await this.store.log('OAUTH_CONNECTED', 'zoho', 'COMPLETED', row.actorId);
        return this.status();
      } catch (error) {
        await this.store.log(
          'OAUTH_CALLBACK',
          'zoho',
          'FAILED',
          row.actorId,
          'OAUTH_EXCHANGE_FAILED',
        );
        throw new BadRequestException(
          'Zoho exchange failed; restart authorization and check client configuration.',
        );
      }
    });
  }
  async status() {
    const row = await this.store
      .one(`SELECT organizationId,organizationName,accountEmail,dataCenter,status,tokenHealth,
      tokenExpiresAt,lastAuthenticatedAt,lastHealthCheckAt,lastSyncAt,scopes FROM zoho_connections WHERE id='zoho'`);
    const scopes = row ? jsonValue<string[]>(row.scopes || []) : [];
    return {
      ...row,
      status: row?.status || 'DISCONNECTED',
      scopes,
      requiredScopes: zohoConfig().scopes,
      missingScopes: zohoConfig().scopes.filter((s) => !scopes.includes(s)),
    };
  }
  async disconnect(actorId: string) {
    return this.store.locked('zoho:auth', async () => {
      const row = await this.store.one(
        "SELECT encryptedRefreshToken FROM zoho_connections WHERE id='zoho'",
      );
      // Keep credentials if remote revocation fails, so an administrator can retry.
      if (row?.encryptedRefreshToken) {
        await this.tokens.tokenRequest('/oauth/v2/revoke/token', {
          token: this.tokens.crypto().decrypt(row.encryptedRefreshToken, 'zoho:refresh'),
        });
      }
      await this.store
        .run(`UPDATE zoho_connections SET encryptedAccessToken=NULL,encryptedRefreshToken=NULL,
        tokenExpiresAt=NULL,status='DISCONNECTED',tokenHealth='DISCONNECTED',scopes=JSON_ARRAY() WHERE id='zoho'`);
      await this.store.run('UPDATE zoho_oauth_states SET usedAt=NOW() WHERE usedAt IS NULL');
      await this.store.log('OAUTH_DISCONNECTED', 'zoho', 'COMPLETED', actorId);
      return this.status();
    });
  }
}
