require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AssetsService } = require('../dist/modules/assets/assets.service');
const { System } = require('../dist/modules/assets/models/system.model');
const { SoftwareService } = require('../dist/modules/assets/software.service');

test('software transfer moves one installation between systems while preserving its license', async () => {
  const service = Object.create(SoftwareService.prototype);
  const t = { LOCK: { UPDATE: 'UPDATE' } };
  const installation = { id: 'installation', systemId: 'first-system', assetId: 'software', licenseId: 'license', version: '1.0' };
  const writes = [];
  Object.assign(service, {
    assignmentModel: { findByPk: async () => installation },
    sequelize: { transaction: async callback => callback(t) },
    unassignInTx: async (current, notes, transaction) => { assert.equal(transaction, t); writes.push(['remove', current.systemId]); },
    assignInTx: async (data, transaction) => { assert.equal(transaction, t); writes.push(['assign', data]); return 'new-installation'; },
    getAssignment: async id => ({ id }),
  });
  await service.transfer('installation', 'second-system');
  assert.equal(writes[0][1], 'first-system');
  assert.equal(writes[1][1].systemId, 'second-system');
  assert.equal(writes[1][1].softwareLicenseId, 'license');
  assert.equal(writes[1][1].version, '1.0');
  writes.length = 0;
  await assert.rejects(service.transfer('installation', 'first-system'), /already on this system/);
  assert.equal(writes.length, 0);
});

test('component transfer preserves its unit, closes system membership and records both employees', async () => {
  const previous = System.findByPk;
  const t = { LOCK: { UPDATE: 'UPDATE' } };
  const current = { id: 'assignment', systemId: 'system', employeeId: null, assetUnitId: 'unit' };
  const asset = { id: 'asset', status: 'ASSIGNED', assignments: [current] };
  const writes = [];
  const service = Object.create(AssetsService.prototype);
  Object.assign(service, {
    findOne: async () => asset,
    sequelize: { transaction: async callback => callback(t) },
    employeeModel: { findByPk: async id => ({ id, name: id, status: 'ACTIVE' }) },
    assetModel: { findByPk: async () => asset },
    assetAssignmentModel: {
      findOne: async () => current,
      update: async (data, options) => { assert.equal(options.transaction, t); writes.push(['close', data]); },
      create: async (data, options) => { assert.equal(options.transaction, t); writes.push(['assign', data]); return { ...data, id: 'new' }; },
    },
    assetUnitModel: { findByPk: async () => ({ id: 'unit', update: async data => writes.push(['unit', data]) }) },
    assetTransferModel: { create: async data => { writes.push(['transfer', data]); return { id: 'transfer' }; } },
    assetHistoryModel: { create: async data => writes.push(['history', data]) },
    refreshAssetAssignmentState: async () => {},
    audit: { log: async () => {} },
  });
  System.findByPk = async id => ({ id, name: id, employeeId: id === 'wrong-owner-system' ? 'other' : 'source' });
  try {
    await assert.rejects(service.transfer('asset', { toEmployeeId: 'destination' }, { id: 'actor' }), /Remove this component/);
    assert.equal(writes.length, 0);
    await service.transfer('asset', { toEmployeeId: 'source', reason: 'Detached from system to same employee' }, { id: 'actor', name: 'Admin' });
    const directAssignment = writes.find(([kind]) => kind === 'assign')[1];
    assert.equal(directAssignment.assetUnitId, 'unit');
    assert.equal(directAssignment.employeeId, 'source');
    assert.equal(directAssignment.systemId, null);
    assert.equal(writes.find(([kind]) => kind === 'close')[1].status, 'RETURNED');
    assert.equal(writes.find(([kind]) => kind === 'unit')[1].status, 'ASSIGNED');
    const detachTransfer = writes.find(([kind]) => kind === 'transfer')[1];
    assert.equal(detachTransfer.fromEmployeeId, 'source');
    assert.equal(detachTransfer.toEmployeeId, 'source');
    assert.match(writes.find(([kind]) => kind === 'history')[1].fromValue, /System: system/);
    assert.equal(writes.find(([kind]) => kind === 'history')[1].toValue, 'source');
    writes.length = 0;
    current.systemId = null;
    current.employeeId = 'source';
    await assert.rejects(service.transfer('asset', { toEmployeeId: 'source' }, { id: 'actor' }), /current owner/);
    assert.equal(writes.length, 0);
    current.systemId = 'system';
    current.employeeId = null;
    await service.transfer('asset', { fromSystemId: 'system', toEmployeeId: 'destination' }, { id: 'actor', name: 'Admin' });
    assert.equal(writes.find(([kind]) => kind === 'close')[1].status, 'RETURNED');
    const assignment = writes.find(([kind]) => kind === 'assign')[1];
    assert.equal(assignment.assetUnitId, 'unit');
    assert.equal(assignment.employeeId, 'destination');
    assert.equal(assignment.systemId ?? null, null);
    const transfer = writes.find(([kind]) => kind === 'transfer')[1];
    assert.equal(transfer.fromEmployeeId, 'source');
    assert.equal(transfer.toEmployeeId, 'destination');
    writes.length = 0;
    await service.transfer('asset', { fromSystemId: 'system', toSystemId: 'second-system', toEmployeeId: 'source' }, { id: 'actor', name: 'Admin' });
    const systemAssignment = writes.find(([kind]) => kind === 'assign')[1];
    assert.equal(systemAssignment.assetUnitId, 'unit');
    assert.equal(systemAssignment.employeeId, null);
    assert.equal(systemAssignment.systemId, 'second-system');
    const sameOwnerTransfer = writes.find(([kind]) => kind === 'transfer')[1];
    assert.equal(sameOwnerTransfer.fromEmployeeId, 'source');
    assert.equal(sameOwnerTransfer.toEmployeeId, 'source');
    assert.match(writes.find(([kind]) => kind === 'history')[1].toValue, /second-system/);
    writes.length = 0;
    await assert.rejects(service.transfer('asset', { fromSystemId: 'system', toSystemId: 'system', toEmployeeId: 'source' }, { id: 'actor' }), /already on this system/);
    await assert.rejects(service.transfer('asset', { fromSystemId: 'system', toSystemId: 'wrong-owner-system', toEmployeeId: 'source' }, { id: 'actor' }), /not assigned to the selected employee/);
    assert.equal(writes.length, 0);
    const findSystem = System.findByPk;
    System.findByPk = async (id, options) => ({ id, name: id, employeeId: options?.transaction ? 'changed-owner' : 'source' });
    await assert.rejects(service.transfer('asset', { fromSystemId: 'system', toEmployeeId: 'source' }, { id: 'actor' }), /System assignment changed/);
    assert.equal(writes.length, 0);
    System.findByPk = findSystem;
    service.assetAssignmentModel.findOne = async () => ({ ...current, systemId: 'different-system' });
    await assert.rejects(service.transfer('asset', { fromSystemId: 'system', toEmployeeId: 'destination' }, { id: 'actor' }), /Assignment changed/);
    assert.equal(writes.length, 0);
  } finally {
    System.findByPk = previous;
  }
});
