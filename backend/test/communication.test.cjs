require('reflect-metadata');
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { CredentialCrypto } = require('../dist/modules/credentials/credential-crypto');
const { ZohoAuthService } = require('../dist/modules/zoho-auth/zoho-auth.service');
const { ZohoTokenService, ZohoFailure } = require('../dist/modules/zoho-auth/zoho-token.service');
const { ZohoMailConnector, ZohoCliqConnector } = require('../dist/modules/connectors/zoho.providers');
const { ConnectorRegistry } = require('../dist/modules/connectors/connectors.module');
const { ZohoHttpService } = require('../dist/modules/connectors/zoho-http.service');
const { IntegrationStore } = require('../dist/modules/connectors/integration.store');
const { CommunicationService } = require('../dist/modules/communication/communication.service');
const { emailStem, availableEmail } = require('../dist/modules/communication/email-policy');
const { REQUIRED_SCOPES, zohoConfig } = require('../dist/modules/zoho-auth/zoho-oauth.config');
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
Object.assign(process.env, { ZOHO_DATA_CENTER: 'in', ZOHO_CLIENT_ID: 'client', ZOHO_CLIENT_SECRET: 'secret',
  ZOHO_REDIRECT_URI: 'https://example.test/api/integrations/zoho/auth/callback', ZOHO_ORGANIZATION_ID: '123',
  ZOHO_TOKEN_ENCRYPTION_KEY: 'ab'.repeat(32), COMMUNICATION_COMPANY_DOMAINS: 'company.test' });

test('OAuth URL uses India endpoints, minimal scopes and opaque stored state', async () => {
  const writes = [];
  const service = new ZohoAuthService({ one: async () => undefined, run: async (sql, params) => writes.push({ sql, params }), log: async () => {} }, { crypto() {} });
  const result = await service.authorize('admin');
  const url = new URL(result.authorizationUrl);
  assert.equal(url.origin, 'https://accounts.zoho.in');
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.deepEqual(url.searchParams.get('scope').split(','), REQUIRED_SCOPES);
  const state = url.searchParams.get('state');
  assert.equal(writes[0].params.hash, createHash('sha256').update(state).digest('hex'));
  assert.ok(!JSON.stringify(writes).includes(state));
});

test('OAuth callback consumes state once, validates admin and saves exchanged tokens', async () => {
  let used = false, saved, exchange;
  const store = { locked: async (_key, action) => action(), log: async () => {},
    one: async sql => sql.includes('zoho_oauth_states') ? used ? undefined : { actorId: 'admin', dataCenter: 'in', organizationId: '123', scopes: REQUIRED_SCOPES } : { scopes: REQUIRED_SCOPES, status: 'CONNECTED' },
    run: async sql => { if (sql.includes('usedAt')) used = true; } };
  const auth = new ZohoAuthService(store, { tokenRequest: async (_path, params) => { exchange = params; return { access_token: 'access', refresh_token: 'refresh', expires_in: 3600 }; }, save: async data => { saved = data; } });
  const result = await auth.callback('opaque-state', 'code');
  assert.equal(exchange.grant_type, 'authorization_code');
  assert.equal(saved.scope, REQUIRED_SCOPES.join(','));
  assert.equal(result.status, 'CONNECTED');
  assert.ok(!JSON.stringify(result).includes('access_token'));
  await assert.rejects(auth.callback('opaque-state', 'code'), /OAuth state/);
  const denied = new ZohoAuthService({ ...store, one: async () => undefined }, {});
  await assert.rejects(denied.callback('forged', 'code'), /OAuth state/);
});

test('token encryption is randomized, authenticated and bound to token purpose', () => {
  const crypto = new CredentialCrypto('ab'.repeat(32));
  const encrypted = crypto.encrypt('refresh-secret', 'zoho:refresh');
  assert.equal(crypto.decrypt(encrypted, 'zoho:refresh'), 'refresh-secret');
  assert.notEqual(encrypted, crypto.encrypt('refresh-secret', 'zoho:refresh'));
  assert.throws(() => crypto.decrypt(encrypted, 'zoho:access'));
  assert.throws(() => new CredentialCrypto('cd'.repeat(32)).decrypt(encrypted, 'zoho:refresh'));
});

test('concurrent expired-token calls perform one refresh and persist encrypted tokens', async () => {
  let queue = Promise.resolve(), calls = 0;
  const crypto = new CredentialCrypto(process.env.ZOHO_TOKEN_ENCRYPTION_KEY);
  const row = { status: 'CONNECTED', dataCenter: 'in', organizationId: '123', tokenExpiresAt: new Date(0),
    encryptedAccessToken: crypto.encrypt('old', 'zoho:access'), encryptedRefreshToken: crypto.encrypt('refresh', 'zoho:refresh') };
  const store = { locked: (_key, action) => { const current = queue.then(action); queue = current.catch(() => {}); return current; },
    one: async () => ({ ...row }), run: async (_sql, value) => {
      row.tokenExpiresAt = value.expires; row.encryptedAccessToken = value.access; row.encryptedRefreshToken = value.refresh;
    } };
  const service = new ZohoTokenService(store);
  service.tokenRequest = async () => { calls++; return { access_token: 'fresh', expires_in: 3600 }; };
  assert.deepEqual(await Promise.all(Array.from({ length: 8 }, () => service.getAccessToken())), Array(8).fill('fresh'));
  assert.equal(calls, 1);
  assert.notEqual(row.encryptedAccessToken, 'fresh');
});

test('revoked refresh tokens mark connection as requiring reconnect', async () => {
  let health;
  const crypto = new CredentialCrypto(process.env.ZOHO_TOKEN_ENCRYPTION_KEY);
  const tokens = new ZohoTokenService({ locked: async (_k, fn) => fn(), one: async () => ({ status: 'CONNECTED', dataCenter: 'in', organizationId: '123',
    tokenExpiresAt: new Date(0), encryptedRefreshToken: crypto.encrypt('refresh', 'zoho:refresh') }), run: async (_sql, params) => { health = params; } });
  tokens.tokenRequest = async () => { throw new ZohoFailure('invalid_token'); };
  await assert.rejects(tokens.getAccessToken(), /invalid_token/);
  assert.equal(health.status, 'RECONNECT_REQUIRED');
});

test('disconnect uses current revoke endpoint and keeps local tokens if revocation fails', async () => {
  let cleared = false, request;
  const crypto = new CredentialCrypto(process.env.ZOHO_TOKEN_ENCRYPTION_KEY);
  const store = { locked: async (_k, fn) => fn(), one: async () => ({ encryptedRefreshToken: crypto.encrypt('refresh', 'zoho:refresh') }),
    run: async () => { cleared = true; }, log: async () => {} };
  const auth = new ZohoAuthService(store, { crypto: () => crypto, tokenRequest: async path => { request = path; throw new ZohoFailure('OAUTH_UNAVAILABLE'); } });
  await assert.rejects(auth.disconnect('admin'));
  assert.equal(request, '/oauth/v2/revoke/token');
  assert.equal(cleared, false);
});

test('token revocation sends Basic client authentication and accepts empty successful response', async () => {
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://accounts.zoho.in/oauth/v2/revoke/token');
    assert.equal(options.headers.Authorization, `Basic ${Buffer.from('client:secret').toString('base64')}`);
    return new Response('', { status: 200 });
  };
  assert.deepEqual(await new ZohoTokenService({}).tokenRequest('/oauth/v2/revoke/token', { token: 'refresh' }), {});
});

test('registry rejects duplicate or unsupported providers and capabilities', () => {
  const mail = { provider: 'zoho-mail', getCapabilities: () => ['mail.create'] };
  const cliq = { provider: 'zoho-cliq', getCapabilities: () => ['channels.add'] };
  const registry = new ConnectorRegistry(mail, cliq);
  assert.equal(registry.get('zoho-cliq', 'channels.add'), cliq);
  assert.throws(() => registry.get('zoho-mail', 'channels.add'));
  assert.throws(() => registry.get('github'));
  assert.throws(() => registry.register(mail));
});

test('email policy supports custom naming, numeric collisions and domain validation', async () => {
  assert.equal(emailStem('Rahul Sharma'), 'rahul.sharma');
  assert.equal(emailStem('Rahul Sharma', '{initial}.{last}'), 'r.sharma');
  const exists = async email => ['rahul.sharma@company.test', 'rahul.sharma1@company.test'].includes(email);
  assert.equal(await availableEmail('Rahul Sharma', undefined, undefined, exists), 'rahul.sharma2@company.test');
  await assert.rejects(availableEmail('Rahul Sharma', undefined, 'rahul.sharma@company.test', exists), /already exists/);
  await assert.rejects(availableEmail('Rahul Sharma', 'evil.test', undefined, exists), /company domain/);
});

test('Mail creates a separate account with one-time password and verifies returned identity', async () => {
  const calls = [];
  const http = { request: async (...args) => { calls.push(args); return args[2] === 'POST' ? { data: { accountId: 'mail-id', zuid: 'user-id' } }
    : { data: { accountId: 'mail-id', zuid: 'user-id', primaryEmailAddress: 'rahul@company.test', enabled: true, mailboxStatus: 'enabled' } }; } };
  const provider = new ZohoMailConnector(http, {}, {});
  assert.equal((await provider.create('rahul@company.test', 'Rahul Sharma', 'temporary-secret')).id, 'mail-id');
  assert.equal(calls[0][1], '/api/organization/123/accounts');
  assert.equal(calls[0][3].oneTimePassword, true);
  assert.equal(calls[0][3].role, 'member');
  assert.equal(calls.length, 2);
});

test('Cliq rejects inactive or cross-organization identity as a usable account', async () => {
  const provider = new ZohoCliqConnector({ request: async () => ({ data: { id: 'cliq-id', zoid: '123', email_id: 'rahul@company.test', status: 'invited' } }) }, {});
  assert.equal((await provider.lookup('rahul@company.test')).active, false);
  provider.http = { request: async () => ({ data: { id: 'cliq-id', zoid: '999', email_id: 'rahul@company.test', status: 'active' } }) };
  await assert.rejects(provider.lookup('rahul@company.test'), /MISMATCH/);
});

test('channel membership avoids duplicate writes and verifies post-write membership', async () => {
  let members = [{ user_id: 'existing' }], mutations = 0;
  const provider = new ZohoCliqConnector({ request: async (_p, _path, method) => { if (method === 'POST') { mutations++; members.push({ user_id: 'new' }); } return {}; } }, {});
  provider.members = async () => members;
  await provider.ensureMember('channel-id', 'existing');
  assert.equal(mutations, 0);
  await provider.ensureMember('channel-id', 'new');
  await provider.ensureMember('channel-id', 'new');
  assert.equal(mutations, 1);
  provider.members = async () => [];
  await assert.rejects(provider.ensureMember('channel-id', 'unverified'), /VERIFICATION_PENDING/);
});

test('HTTP rejects permission and rate limits, redacts errors and blocks disabled connectors', async () => {
  const writes = [];
  const service = new ZohoHttpService({ one: async () => ({ enabled: true }), run: async (_s, v) => writes.push(v) }, { getAccessToken: async () => 'token' });
  global.fetch = async () => new Response(JSON.stringify({ message: 'echoed-password' }), { status: 403 });
  await assert.rejects(service.request('zoho-mail', '/api/test', 'POST', { password: 'secret' }), /PERMISSION_DENIED/);
  assert.ok(!JSON.stringify(writes).includes('password'));
  global.fetch = async () => new Response('{}', { status: 429 });
  await assert.rejects(service.request('zoho-cliq', '/api/v2/test', 'POST'), /RATE_LIMITED/);
  service.store = { one: async () => ({ enabled: false }) };
  await assert.rejects(service.request('zoho-mail', '/api/test'), /CONNECTOR_DISABLED/);
});

test('pagination traverses all pages and refuses a missing continuation token', async () => {
  const service = new ZohoHttpService({}, {});
  let calls = 0;
  service.request = async () => ++calls === 1 ? { channels: [{ channel_id: '1' }], has_more: true, next_token: 'next' } : { channels: [{ channel_id: '2' }], has_more: false };
  assert.equal((await service.paged('/api/v2/channels', 'channels')).length, 2);
  service.request = async () => ({ channels: [], has_more: true });
  await assert.rejects(service.paged('/api/v2/channels', 'channels'), /INVALID_PAGINATION/);
});

test('SQL repository hides parameters and takes/releases the lock on one connection', async () => {
  const transaction = { id: 'connection' }, queries = [];
  const store = new IntegrationStore({ transaction: async (_options, fn) => fn(transaction), query: async (sql, options) => { queries.push({ sql, options }); return [{ acquired: 1 }]; } });
  await assert.rejects(store.locked('employee:1', async () => { throw new Error('failed'); }), /failed/);
  assert.equal(queries.length, 2);
  assert.ok(queries[1].sql.includes('RELEASE_LOCK'));
  assert.ok(queries.every(q => q.options.transaction === transaction && q.options.logging === false));
  const failing = new IntegrationStore({ query: async () => { throw new Error('SQL with secret'); } });
  await assert.rejects(failing.run('UPDATE secrets', { token: 'secret' }), error => !error.message.includes('secret'));
});

test('partial onboarding failure persists successful tasks; retry resumes failed step only', async () => {
  const statuses = {}, attempts = {}, audit = [], requests = new Map();
  const store = { locked: async (_key, action) => action(), log: async (...args) => audit.push(args),
    one: async (sql, params) => {
      if (sql.includes('communication_requests')) return requests.get(params.key);
      if (sql.includes('SELECT status FROM onboarding_tasks')) return { status: statuses[params.type] };
      return null;
    }, rows: async sql => sql.includes('SELECT status') ? Object.values(statuses).map(status => ({ status })) : [],
    run: async (sql, params) => {
      if (sql.includes('INSERT IGNORE INTO communication_requests')) requests.set(params.key, { intentHash: params.hash });
      if (sql.includes('INSERT IGNORE INTO onboarding_tasks')) statuses[params.type] ||= 'PENDING';
      if (sql.includes("status='IN_PROGRESS',attemptCount")) { statuses[params.type] = 'IN_PROGRESS'; attempts[params.type] = (attempts[params.type] || 0) + 1; }
      if (sql.includes("UPDATE onboarding_tasks SET status='COMPLETED'")) statuses[params.type] = 'COMPLETED';
      if (sql.includes('UPDATE onboarding_tasks SET status=:status')) statuses[params.type] = params.status;
    } };
  const service = new CommunicationService(store, {});
  let mailCreates = 0, cliqCreates = 0, channelAttempts = 0;
  service.employee = async id => ({ id, name: 'Rahul Sharma' });
  service.provisionMail = async () => { mailCreates++; };
  service.provisionCliq = async () => { cliqCreates++; };
  service.assignChannels = async () => { if (++channelAttempts === 1) throw new ZohoFailure('RATE_LIMITED', true); };
  service.account = async () => ({ activationStatus: 'COMPLETED' });
  service.status = async () => ({ statuses: { ...statuses } });
  const dto = { idempotencyKey: 'request-123', temporaryPassword: 'never-store-this' };
  const first = await service.provision('employee', dto, 'admin');
  assert.equal(first.statuses.MAIL, 'COMPLETED');
  assert.equal(first.statuses.CHANNELS, 'RETRY_REQUIRED');
  const second = await service.provision('employee', dto, 'admin');
  assert.ok(Object.values(second.statuses).every(status => status === 'COMPLETED'));
  assert.equal(mailCreates, 1); assert.equal(cliqCreates, 1); assert.equal(channelAttempts, 2);
  assert.equal(attempts.CHANNELS, 2);
  assert.ok(!JSON.stringify(audit).includes('never-store-this'));
  await assert.rejects(service.provision('employee', { ...dto, email: 'other@company.test' }, 'admin'), /different input/);
});

test('ambiguous Mail create is reconciled by lookup without another create', async () => {
  let creates = 0, saved;
  const account = { email: 'rahul@company.test', createAttempted: 1 };
  const store = { one: async () => account, run: async (_sql, params) => { saved = params; } };
  const service = new CommunicationService(store, { mail: { lookup: async () => ({ id: 'mail', userId: 'user', enabled: true }), create: async () => { creates++; } } });
  await service.provisionMail({ id: 'employee', name: 'Rahul' }, {});
  assert.equal(creates, 0); assert.equal(saved.mailId, 'mail');
  service.registry.mail.lookup = async () => null;
  await assert.rejects(service.provisionMail({ id: 'employee', name: 'Rahul' }, { temporaryPassword: 'secret' }), /AMBIGUOUS/);
  assert.equal(creates, 0);
});

test('RBAC denies employees and requires permission on every integration mutation', () => {
  const { CommunicationController } = require('../dist/modules/communication/communication.module');
  const { ZohoAuthController } = require('../dist/modules/zoho-auth/zoho-auth.controller');
  const { ConnectorsController } = require('../dist/modules/connectors/connectors.module');
  const { RolesGuard } = require('../dist/common/guards/roles.guard');
  const { Reflector } = require('@nestjs/core');
  const { PERMISSIONS_KEY } = require('../dist/common/decorator/roles.decorator');
  const guard = new RolesGuard(new Reflector());
  for (const [Controller, names] of [[CommunicationController, ['createProfile', 'updateProfile', 'deleteProfile', 'syncChannels', 'assign', 'mail', 'cliq', 'onboard', 'syncMemberships', 'retry', 'removeMember', 'activation']],
    [ZohoAuthController, ['url', 'reconnect', 'disconnect']], [ConnectorsController, ['test', 'toggle']]]) {
    for (const name of names) {
      const handler = Controller.prototype[name];
      const permissions = Reflect.getMetadata(PERMISSIONS_KEY, handler);
      assert.ok(permissions?.length, name);
      const context = user => ({ getHandler: () => handler, getClass: () => Controller, switchToHttp: () => ({ getRequest: () => ({ user }) }) });
      assert.throws(() => guard.canActivate(context({ permissions: [] })), /permission/);
      assert.equal(guard.canActivate(context({ permissions })), true);
    }
  }
});

test('DTOs reject invalid emails, unknown channel IDs and null temporary passwords', async () => {
  const { plainToInstance } = require('class-transformer');
  const { validate } = require('class-validator');
  const { ProvisionDto, ProfileDto, UpdateProfileDto } = require('../dist/modules/communication/communication.dto');
  assert.ok((await validate(plainToInstance(ProvisionDto, { idempotencyKey: 'request-123', temporaryPassword: null }))).length);
  assert.ok((await validate(plainToInstance(ProvisionDto, { idempotencyKey: 'request-123', email: 'invalid' }))).length);
  assert.ok((await validate(plainToInstance(ProfileDto, { name: 'Backend', code: 'BACKEND', channelIds: ['not-uuid'] }))).length);
  assert.ok((await validate(plainToInstance(UpdateProfileDto, { channelIds: null }))).length);
});

test('connection status contains metadata and permission gaps without selecting tokens', async () => {
  const auth = new ZohoAuthService({ one: async sql => {
    assert.ok(!sql.includes('encryptedAccessToken') && !sql.includes('encryptedRefreshToken'));
    return { organizationId: '123', dataCenter: 'in', status: 'CONNECTED', scopes: JSON.stringify(['ZohoMail.accounts.READ']) };
  } }, {});
  const status = await auth.status();
  assert.equal(status.organizationId, '123');
  assert.ok(status.missingScopes.includes('ZohoCliq.Channels.UPDATE'));
  assert.ok(!JSON.stringify(status).includes('encrypted'));
});

test('Cliq invitation is separate, gated by configuration and checked for partial failure', async () => {
  const old = process.env.ZOHO_CLIQ_ALLOW_CREATE;
  let created = 0;
  const provider = new ZohoCliqConnector({ request: async (_p, path, method, body) => {
    if (method === 'POST') { created++; assert.equal(path, '/api/v2/users'); assert.equal(body.users[0].email_id, 'rahul@company.test'); return { data: { success_users: ['rahul@company.test'], failed_users: {} } }; }
    return { data: { id: '1234', zoid: '123', email_id: 'rahul@company.test', status: 'active' } };
  } }, {});
  try {
    process.env.ZOHO_CLIQ_ALLOW_CREATE = 'false';
    await assert.rejects(provider.create('rahul@company.test', 'Rahul Sharma'), /ADMIN_INVITATION_REQUIRED/);
    assert.equal(created, 0);
    process.env.ZOHO_CLIQ_ALLOW_CREATE = 'true';
    assert.equal((await provider.create('rahul@company.test', 'Rahul Sharma')).id, '1234');
    assert.equal(created, 1);
    provider.http = { request: async () => ({ data: { success_users: [], failed_users: { 'rahul@company.test': 'invitation failed' } } }) };
    await assert.rejects(provider.create('rahul@company.test', 'Rahul Sharma'), /INVITATION_REJECTED/);
  } finally { if (old === undefined) delete process.env.ZOHO_CLIQ_ALLOW_CREATE; else process.env.ZOHO_CLIQ_ALLOW_CREATE = old; }
});

test('channel-only failure stores assignment status and retry verifies before another write', async () => {
  const writes = [], memberships = new Set();
  let fail = true;
  const service = new CommunicationService({ one: async sql => sql.includes('accounts') ? { cliqUserId: 'user' } : { channelIds: ['first', 'second'] },
    run: async (sql, values) => writes.push({ sql, values }) }, { cliq: { ensureMember: async id => {
      if (id === 'second' && fail) throw new ZohoFailure('RATE_LIMITED', true);
      memberships.add(id);
    } } });
  service.validateChannels = async () => {};
  service.channel = async id => ({ externalChannelId: id });
  await assert.rejects(service.assignChannels('employee'), /RATE_LIMITED/);
  assert.ok(memberships.has('first'));
  assert.ok(writes.some(w => w.sql.includes("status='RETRY_REQUIRED'") && w.values.id === 'second'));
  fail = false;
  await service.assignChannels('employee');
  assert.deepEqual([...memberships], ['first', 'second']);
});

test('profile assignment atomically saves plan and invalidates the channel checkpoint', async () => {
  let operations;
  const service = new CommunicationService({ locked: async (_key, fn) => fn(), atomic: async ops => { operations = ops; }, log: async () => {} }, {});
  service.preview = async employeeId => ({ employeeId, channelIds: ['channel'], channels: [] });
  const result = await service.assign('employee', { profileId: 'profile' }, 'admin');
  assert.equal(operations.length, 3);
  assert.equal(operations[0].values.channels, '["channel"]');
  assert.ok(operations[1].sql.includes("taskType='CHANNELS'"));
  assert.equal(result.employeeId, 'employee');
});

test('SQL lock contention prevents action from running', async () => {
  let ran = false;
  const store = new IntegrationStore({ transaction: async (_options, fn) => fn({}), query: async () => [{ acquired: 0 }] });
  await assert.rejects(store.locked('employee', async () => { ran = true; }), /already running/);
  assert.equal(ran, false);
});

test('Canada uses the official zohocloud.ca origins', () => {
  const old = process.env.ZOHO_DATA_CENTER;
  try {
    process.env.ZOHO_DATA_CENTER = 'ca';
    assert.equal(zohoConfig().accounts, 'https://accounts.zohocloud.ca');
    assert.equal(zohoConfig().mail, 'https://mail.zohocloud.ca');
    assert.equal(zohoConfig().cliq, 'https://cliq.zohocloud.ca');
  } finally { process.env.ZOHO_DATA_CENTER = old; }
});
