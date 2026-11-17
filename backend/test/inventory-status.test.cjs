require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AssetsService } = require('../dist/modules/assets/assets.service');

function fixture({ status = 'AVAILABLE', unitStatuses = ['AVAILABLE'], active = 0 } = {}) {
  const service = Object.create(AssetsService.prototype);
  const asset = { id: 'asset', status, organisationId: null, categoryId: 'category' };
  const tx = { LOCK: { UPDATE: 'UPDATE' } };
  const history = [], writes = [];
  const units = unitStatuses.map((value, i) => ({ id: `unit-${i}`, status: value,
    update: async function(data, options) {
      assert.equal(options.transaction, tx);
      writes.push({ id: this.id, ...data });
      Object.assign(this, data);
    },
  }));
  Object.assign(service, {
    findOne: async () => asset,
    sequelize: { transaction: async callback => callback(tx) },
    assetModel: {
      findByPk: async () => asset,
      update: async (data, options) => { assert.equal(options.transaction, tx); Object.assign(asset, data); },
    },
    assetUnitModel: { findAll: async options => {
      assert.equal(options.lock, tx.LOCK.UPDATE);
      assert.equal(options.transaction, tx);
      return units;
    } },
    assetAssignmentModel: { count: async () => active },
    assetHistoryModel: { create: async (data, options) => { assert.equal(options.transaction, tx); history.push(data); } },
    audit: { log: async () => {} },
  });
  return { service, asset, units, history, writes };
}
const actor = { id: 'user', name: 'Admin' };

test('inventory repair status updates physical units and records unit history in the same transaction', async () => {
  const { service, units, asset, history } = fixture({ unitStatuses: ['AVAILABLE', 'DAMAGED'] });
  await service.update('asset', { status: 'REPAIR' }, actor);
  assert.equal(asset.status, 'REPAIR');
  assert.deepEqual(units.map(unit => unit.status), ['REPAIR', 'REPAIR']);
  assert.deepEqual(history.filter(event => event.action === 'UNIT_STATUS_CHANGED').map(event =>
    [event.assetUnitId, event.fromValue, event.toValue]), [
    ['unit-0', 'AVAILABLE', 'REPAIR'], ['unit-1', 'DAMAGED', 'REPAIR'],
  ]);
});

test('returning an inventory item to stock clears its unit maintenance status', async () => {
  const { service, units, asset } = fixture({ status: 'REPAIR', unitStatuses: ['REPAIR'] });
  await service.update('asset', { status: 'AVAILABLE' }, actor);
  assert.equal(units[0].status, 'AVAILABLE');
  assert.equal(asset.status, 'AVAILABLE');
});

test('active assignments prevent inventory maintenance changes before any unit is changed', async () => {
  for (const options of [{ active: 1 }, { unitStatuses: ['ASSIGNED'] }]) {
    const { service, writes } = fixture(options);
    await assert.rejects(service.update('asset', { status: 'REPAIR' }, actor), /Return the current assignment/);
    assert.equal(writes.length, 0);
  }
});

test('saving the current aggregate status preserves mixed physical unit statuses', async () => {
  const { service, units, writes } = fixture({ unitStatuses: ['AVAILABLE', 'REPAIR'] });
  await service.update('asset', { name: 'Renamed', status: 'AVAILABLE' }, actor);
  assert.deepEqual(units.map(unit => unit.status), ['AVAILABLE', 'REPAIR']);
  assert.equal(writes.length, 0);
});
