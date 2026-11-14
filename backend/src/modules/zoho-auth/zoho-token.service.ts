import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CredentialCrypto } from '../credentials/credential-crypto';
import { IntegrationStore } from '../connectors/integration.store';
import { requireOAuthConfig, zohoConfig } from './zoho-oauth.config';

export class ZohoFailure extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable = false,
    public readonly httpStatus = 502,
  ) {
    super(code);
  }
}

@Injectable()
export class ZohoTokenService {
  constructor(private readonly store: IntegrationStore) {}
  crypto() {
    const key = process.env.ZOHO_TOKEN_ENCRYPTION_KEY || '';
    if (!/^[a-fA-F0-9]{64}$/.test(key))
      throw new ServiceUnavailableException('ZOHO_TOKEN_ENCRYPTION_KEY must be 64 hex characters');
    return new CredentialCrypto(key);
  }
  async tokenRequest(path: string, params: Record<string, string>) {
    const config = requireOAuthConfig();
    const revoke = path === '/oauth/v2/revoke/token';
    let response: Response;
    try {
      response = await fetch(`${config.accounts}${path}`, {
        method: 'POST',
        headers: revoke
          ? {
              Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
            }
          : undefined,
        body: new URLSearchParams(params),
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
    } catch {
      throw new ZohoFailure('OAUTH_UNAVAILABLE', true);
    }
    let data: any;
    try {
      const body = await response.text();
      data = body ? JSON.parse(body) : revoke ? {} : null;
    } catch {
      throw new ZohoFailure('OAUTH_INVALID_RESPONSE', true);
    }
    if (!data || typeof data !== 'object') throw new ZohoFailure('OAUTH_INVALID_RESPONSE', true);
    if (!response.ok || data.error)
      throw new ZohoFailure(
        ['invalid_code', 'invalid_client', 'invalid_token', 'access_denied'].includes(data.error)
          ? data.error
          : 'OAUTH_REJECTED',
        response.status === 429 || response.status >= 500,
      );
    return data;
  }
  async save(data: any, refresh?: string) {
    if (
      typeof data.access_token !== 'string' ||
      !data.access_token ||
      !Number.isFinite(Number(data.expires_in)) ||
      Number(data.expires_in) <= 0
    )
      throw new ZohoFailure('OAUTH_INVALID_RESPONSE');
    const refreshToken = data.refresh_token || refresh;
    if (typeof refreshToken !== 'string' || !refreshToken)
      throw new ZohoFailure('REFRESH_TOKEN_MISSING');
    const config = zohoConfig();
    const scopes = typeof data.scope === 'string' ? data.scope.split(/[ ,]+/).filter(Boolean) : [];
    await this.store.run(
      `UPDATE zoho_connections SET encryptedAccessToken=:access, encryptedRefreshToken=:refresh,
      tokenExpiresAt=:expires, status='CONNECTED', tokenHealth='HEALTHY', lastAuthenticatedAt=NOW(),
      scopes=COALESCE(:scopes,scopes), dataCenter=:dc, organizationId=:org WHERE id='zoho'`,
      {
        access: this.crypto().encrypt(data.access_token, 'zoho:access'),
        refresh: this.crypto().encrypt(refreshToken, 'zoho:refresh'),
        expires: new Date(Date.now() + Number(data.expires_in) * 1000),
        scopes: scopes.length ? JSON.stringify(scopes) : null,
        dc: config.dc,
        org: config.organizationId,
      },
    );
  }
  async getAccessToken(): Promise<string> {
    // Retry bounded contention; each contender rereads after obtaining the distributed lock.
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        return await this.store.locked('zoho:auth', async () => {
          const row = await this.store.one("SELECT * FROM zoho_connections WHERE id='zoho'");
          if (
            !row ||
            row.status !== 'CONNECTED' ||
            row.dataCenter !== zohoConfig().dc ||
            row.organizationId !== zohoConfig().organizationId
          )
            throw new ZohoFailure('RECONNECT_REQUIRED');
          if (new Date(row.tokenExpiresAt).getTime() > Date.now() + 60000)
            return this.crypto().decrypt(row.encryptedAccessToken, 'zoho:access');
          const config = requireOAuthConfig();
          const refresh = this.crypto().decrypt(row.encryptedRefreshToken, 'zoho:refresh');
          try {
            const result = await this.tokenRequest('/oauth/v2/token', {
              grant_type: 'refresh_token',
              refresh_token: refresh,
              client_id: config.clientId,
              client_secret: config.clientSecret,
            });
            await this.save(result, refresh);
            return result.access_token as string;
          } catch (error) {
            await this.store.run(
              "UPDATE zoho_connections SET tokenHealth=:health, status=:status WHERE id='zoho'",
              {
                health:
                  error instanceof ZohoFailure && error.retryable
                    ? 'DEGRADED'
                    : 'RECONNECT_REQUIRED',
                status:
                  error instanceof ZohoFailure && error.retryable
                    ? 'CONNECTED'
                    : 'RECONNECT_REQUIRED',
              },
            );
            throw error;
          }
        });
      } catch (error) {
        if ((error as any)?.status !== 409 || attempt === 39) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    throw new ZohoFailure('REFRESH_BUSY', true);
  }
}
