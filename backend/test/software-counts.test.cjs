require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SoftwareService } = require('../dist/modules/assets/software.service');
const row = data => ({ toJSON: () => data });

test('catalog totals include modern and legacy system assignments', async () => {
  const service = Object.create(SoftwareService.prototype);
  Object.assign(service, {
    softwareDetailsModel: { findAndCountAll: async () => ({ rows: [{ assetId: 'app', toJSON: () => ({ assetId: 'app' }) }], count: 1 }) },
    assignmentModel: { findAll: async () => [{ assetId: 'app', count: '2' }] },
    legacyAssignmentModel: { findAll: async () => [{ assetId: 'app', count: '3' }] },
  });
  const result = await service.findAll();
  assert.equal(result.data[0].activeInstallations, 5);
});

test('assignment lists normalize legacy rows and preserve filters', async () => {
  const service = Object.create(SoftwareService.prototype);
  let legacyQuery;
  Object.assign(service, {
    assignmentModel: { findAll: async () => [row({ id: 'modern', installedAt: '2026-01-01' })] },
    legacyAssignmentModel: { findAll: async query => {
      legacyQuery = query;
      return [row({ id: 'legacy', softwareAssetId: 'app', systemId: 'system', status: 'ACTIVE', assignedAt: '2026-02-01', softwareAsset: { name: 'App' } })];
    } },
  });
  const result = await service.getAssignments({ softwareAssetId: 'app', systemId: 'system', employeeId: 'employee', status: 'ACTIVE' });
  assert.equal(result.length, 2);
  assert.equal(result[0].id, 'legacy');
  assert.equal(result[0].assetId, 'app');
  assert.equal(result[0].asset.name, 'App');
  assert.equal(result[0].assignmentStatus, 'ACTIVE');
  assert.equal(legacyQuery.where.systemId, 'system');
  assert.equal(legacyQuery.where.softwareAssetId, 'app');
  assert.equal(legacyQuery.where.status, 'ACTIVE');
  assert.deepEqual(legacyQuery.include[1].where, { employeeId: 'employee' });
  assert.equal((await service.getAssignments({ licenseId: 'license' })).length, 1);
  assert.equal((await service.getAssignments({ installationStatus: 'BLOCKED' })).length, 1);
});

test('assigning software updates usage in the same transaction', async () => {
  const service = Object.create(SoftwareService.prototype);
  const transaction = {};
  let usageWrite;
  Object.assign(service, {
    assertSoftwareAsset: async () => ({}),
    softwareDetailsModel: { findOne: async () => ({ usage: 'UNKNOWN', update: async (patch, options) => { usageWrite = { patch, options }; } }) },
    systemModel: { findByPk: async () => ({ employeeId: 'employee' }) },
    assignmentModel: { findOne: async () => null, create: async (_, options) => { assert.equal(options.transaction, transaction); return { id: 'assignment' }; } },
    legacyAssignmentModel: { findOne: async () => null },
    resolveLicense: async () => null,
  });
  assert.equal(await service.assignInTx({ softwareAssetId: 'app', systemId: 'system' }, transaction), 'assignment');
  assert.deepEqual(usageWrite.patch, { usage: 'IN_USE' });
  assert.equal(usageWrite.options.transaction, transaction);
});

test('blocked software cannot be assigned or have its usage overwritten', async () => {
  const service = Object.create(SoftwareService.prototype);
  Object.assign(service, {
    assertSoftwareAsset: async () => ({}),
    softwareDetailsModel: { findOne: async () => ({ usage: 'BLOCKED', update: async () => assert.fail('blocked usage changed') }) },
  });
  await assert.rejects(service.assignInTx({ softwareAssetId: 'app', systemId: 'system' }, {}), /blocked/);
});

test('direct software custody marks usage in use without changing hardware usage', async () => {
  const { AssetsService } = require('../dist/modules/assets/assets.service');
  const { SoftwareDetails } = require('../dist/modules/assets/models/software-details.model');
  const previous = SoftwareDetails.update;
  const writes = [];
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  SoftwareDetails.update = async (patch, options) => writes.push({patch, options});
  try {
    for (const kind of ['SOFTWARE', 'HARDWARE']) {
      const service = Object.create(AssetsService.prototype);
      Object.assign(service, {
        assetModel: { findByPk: async () => ({ kind, quantity: 2, status: 'AVAILABLE', update: async () => {} }) },
        assetUnitModel: { count: async () => 1 },
      });
      await service.refreshAssetAssignmentState('asset', transaction);
    }
    assert.equal(writes.length, 1);
    assert.deepEqual(writes[0].patch, {usage: 'IN_USE'});
    assert.equal(writes[0].options.transaction, transaction);
  } finally { SoftwareDetails.update = previous; }
});
