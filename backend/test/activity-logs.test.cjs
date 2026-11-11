require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { of, throwError, lastValueFrom } = require('rxjs');
const { Op } = require('sequelize');
const { ActivityInterceptor } = require('../dist/modules/audit/activity.interceptor');
const { AuditService } = require('../dist/modules/audit/audit.service');
const { AuditController } = require('../dist/modules/audit/audit.controller');
const { PERMISSIONS_KEY } = require('../dist/common/decorator/roles.decorator');

function context(controller, method = 'POST', handler = 'create', extra = {}) {
  return {
    getClass: () => ({ name: controller }),
    getHandler: () => ({ name: handler }),
    switchToHttp: () => ({ getRequest: () => ({ method, user: { id: 'actor' }, params: {}, route: { path: '/software' }, ...extra }) }),
  };
}

test('uncovered business mutations are logged without request secrets or responses', async () => {
  const records = [];
  const interceptor = new ActivityInterceptor({ log: async record => records.push(record) });
  for (const controller of ['SoftwareController', 'AssetCategoryController', 'OrganisationsController']) {
    const result = { id: 'record', password: 'secret', licenseKey: 'sensitive' };
    assert.equal(await lastValueFrom(interceptor.intercept(context(controller, 'PATCH', 'updateLicense', {
      params: { licenseId: 'license' }, body: { password: 'secret' },
    }), { handle: () => of(result) })), result);
  }
  assert.equal(records.length, 3);
  assert.equal(records[0].action, 'SOFTWARE_UPDATE_LICENSE');
  assert.equal(records[0].entityId, 'license');
  assert.equal(records[0].userId, 'actor');
  assert(!JSON.stringify(records).includes('secret'));
  assert(!JSON.stringify(records).includes('sensitive'));
});

test('failed mutations, reads, and controllers with existing audit coverage are not logged twice', async () => {
  let count = 0;
  const interceptor = new ActivityInterceptor({ log: async () => count++ });
  for (const ctx of [context('SoftwareController', 'GET'), context('AssetsController'), context('UsersController')]) {
    await lastValueFrom(interceptor.intercept(ctx, { handle: () => of({}) }));
  }
  await assert.rejects(lastValueFrom(interceptor.intercept(context('SoftwareController'), { handle: () => throwError(() => new Error('rejected')) })), /rejected/);
  assert.equal(count, 0);
});

test('successful sign-ins record the returned user identity without tokens', async () => {
  let record;
  const interceptor = new ActivityInterceptor({ log: async value => record = value });
  await lastValueFrom(interceptor.intercept(context('AuthController', 'POST', 'login', { user: undefined }), {
    handle: () => of({ user: { id: 'signed-in' }, accessToken: 'private-token' }),
  }));
  assert.equal(record.userId, 'signed-in');
  assert.equal(record.entityId, 'signed-in');
  assert.equal(record.action, 'ACCOUNT_LOGIN');
  assert(!JSON.stringify(record).includes('private-token'));
});

test('audit failures do not report an already committed business operation as failed', async () => {
  const interceptor = new ActivityInterceptor({ log: async () => { throw new Error('offline'); } });
  interceptor.logger = { error: () => {} };
  const result = { id: 'saved' };
  assert.equal(await lastValueFrom(interceptor.intercept(context('SoftwareController'), { handle: () => of(result) })), result);
});

test('feed supports search, date filters, stable pagination and excludes raw metadata', async () => {
  let query;
  const service = new AuditService({ findAndCountAll: async options => { query = options; return { rows: [], count: 51 }; } });
  const result = await service.list({ entity: 'Asset', action: 'ASSET_CREATED', search: 'Ada', from: '2026-11-01', to: '2026-11-11', take: 50, skip: 50 });
  assert.equal(query.where.entity, 'Asset');
  assert.equal(query.where.action, 'ASSET_CREATED');
  assert.equal(query.where[Op.and][0][Op.or].length, 5);
  assert.equal(query.where.createdAt[Op.lt].toISOString(), '2026-11-12T00:00:00.000Z');
  assert.equal(query.offset, 50);
  assert.equal(query.limit, 50);
  assert(!query.attributes.includes('metadata'));
  assert.deepEqual(query.include[0].attributes, ['id', 'name', 'email']);
  assert.equal(result.page, 2);
});

test('feed validates pagination and dates and requires user management permission', async () => {
  const controller = new AuditController({ list: async params => params });
  for (const page of ['0', '-1', '1.5', 'NaN', '99999999999999999']) {
    assert.throws(() => controller.list(undefined, undefined, page), /positive integer/);
  }
  assert.throws(() => controller.list(undefined, undefined, '1', undefined, '2026-02-30'), /YYYY-MM-DD/);
  assert.throws(() => controller.list(undefined, undefined, '1', undefined, '2026-11-12', '2026-11-01'), /precede/);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, AuditController.prototype.list), ['users.manage']);
});

test('displayed action labels and user/action combinations search all words', async () => {
  let where;
  const service = new AuditService({ findAndCountAll: async options => { where = options.where; return { rows: [], count: 0 }; } });
  await service.list({ search: '  Ada Asset Created  ', entity: ' Asset ', action: '' });
  assert.equal(where.entity, 'Asset');
  assert.equal(where.action, undefined);
  const clauses = where[Op.and];
  assert.equal(clauses.length, 3);
  const fields = { action: 'ASSET_CREATED', entity: 'Asset', entityId: 'abc', '$user.name$': 'Ada Lovelace', '$user.email$': 'ada@example.com' };
  assert(clauses.every(clause => clause[Op.or].some(condition => {
    const [field] = Object.keys(condition);
    return fields[field].toLowerCase().includes(condition[field][Op.like].slice(1, -1).toLowerCase());
  })));
});

test('search wildcards are escaped instead of matching every activity', async () => {
  let where;
  const service = new AuditService({ findAndCountAll: async options => { where = options.where; return { rows: [], count: 0 }; } });
  await service.list({ search: '%' });
  assert.equal(where[Op.and][0][Op.or][0].action[Op.like], '%\\%%');
});
