import { Injectable } from '@nestjs/common';
import { IntegrationStore } from './integration.store';
import { ZohoFailure, ZohoTokenService } from '../zoho-auth/zoho-token.service';
import { zohoConfig } from '../zoho-auth/zoho-oauth.config';

@Injectable()
export class ZohoHttpService {
  constructor(
    private readonly store: IntegrationStore,
    private readonly tokens: ZohoTokenService,
  ) {}
  async request(
    provider: 'zoho-mail' | 'zoho-cliq',
    path: string,
    method = 'GET',
    body?: unknown,
  ): Promise<any> {
    const connector = await this.store.one(
      'SELECT enabled FROM connectors WHERE provider=:provider',
      { provider },
    );
    if (!connector?.enabled) throw new ZohoFailure('CONNECTOR_DISABLED');
    const token = await this.tokens.getAccessToken();
    const config = zohoConfig();
    if (!path.startsWith('/') || path.startsWith('//')) throw new ZohoFailure('INVALID_API_PATH');
    try {
      let result: any;
      for (let attempt = 0; attempt < 3; attempt++) {
        let response: Response;
        try {
          response = await fetch(`${provider === 'zoho-mail' ? config.mail : config.cliq}${path}`, {
            method,
            body: body === undefined ? undefined : JSON.stringify(body),
            redirect: 'error',
            headers: {
              Authorization: `Zoho-oauthtoken ${token}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(15000),
          });
        } catch {
          throw new ZohoFailure('API_UNAVAILABLE_OR_AMBIGUOUS', true);
        }
        // Only reads are automatically retried; mutations must reconcile remote state first.
        if (
          method === 'GET' &&
          (response.status === 429 || response.status >= 500) &&
          attempt < 2
        ) {
          const delay = Math.min(
            5000,
            Math.max(500, Number(response.headers.get('retry-after') || 1) * 1000),
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        try {
          result = response.status === 204 ? {} : await response.json();
        } catch {
          throw new ZohoFailure('INVALID_API_RESPONSE', true);
        }
        if (!result || typeof result !== 'object')
          throw new ZohoFailure('INVALID_API_RESPONSE', true);
        const status = Number(result?.status?.code || response.status);
        if (!response.ok || status >= 400 || result?.error || (result?.code && !result?.data)) {
          const code =
            status === 401
              ? 'AUTHENTICATION_FAILED'
              : status === 403
                ? 'PERMISSION_DENIED'
                : status === 429
                  ? 'RATE_LIMITED'
                  : status === 404
                    ? 'NOT_FOUND'
                    : 'API_REJECTED';
          throw new ZohoFailure(code, status === 429 || status >= 500, status);
        }
        break;
      }
      await this.store.run(
        `UPDATE connectors SET health='HEALTHY',lastSuccessfulRequest=NOW(),lastError=NULL WHERE provider=:provider`,
        { provider },
      );
      return result;
    } catch (error) {
      const code = error instanceof ZohoFailure ? error.code : 'API_FAILURE';
      await this.store.run(
        "UPDATE connectors SET health='DEGRADED',lastError=:code WHERE provider=:provider",
        { provider, code },
      );
      if (code === 'AUTHENTICATION_FAILED')
        await this.store.run(
          "UPDATE zoho_connections SET tokenHealth='RECONNECT_REQUIRED',status='RECONNECT_REQUIRED' WHERE id='zoho'",
        );
      throw error;
    }
  }
  async paged(path: string, key: string): Promise<any[]> {
    const result: any[] = [];
    let next: string | undefined;
    const seen = new Set<string>();
    for (let page = 0; page < 1000; page++) {
      const data = await this.request(
        'zoho-cliq',
        path +
          (next ? `${path.includes('?') ? '&' : '?'}next_token=${encodeURIComponent(next)}` : ''),
      );
      if (!Array.isArray(data[key])) throw new ZohoFailure('INVALID_API_RESPONSE');
      result.push(...data[key]);
      if (!data.has_more) return result;
      if (typeof data.next_token !== 'string' || seen.has(data.next_token))
        throw new ZohoFailure('INVALID_PAGINATION');
      next = data.next_token;
      seen.add(next!);
    }
    throw new ZohoFailure('PAGINATION_LIMIT');
  }
}
