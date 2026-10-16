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
