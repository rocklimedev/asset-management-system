require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AssetsService } = require('../dist/modules/assets/assets.service');
function fixture({ available = 1, assigned = false } = {}) {
  const service = Object.create(AssetsService.prototype);
  const writes = [];
  const tx = { LOCK: { UPDATE: 'UPDATE' } };
  const unit = { id: 'unit', unitCode: 'PC-1', notes: 'Original', update: async data => writes.push(data) };
  Object.assign(service, {
    sequelize: { transaction: async fn => fn(tx) },
    assetModel: { findByPk: async () => ({ update: async data => writes.push(data) }) },
    assetUnitModel: { findAll: async () => available ? [unit] : [], count: async () => 0 },
    assetAssignmentModel: { findOne: async () => assigned ? {} : null },
    assetHistoryModel: { create: async data => writes.push(data) },
    refreshAssetAssignmentState: async () => {},
    audit: { log: async (data, transaction) => { assert.equal(transaction, tx); writes.push(data); } },
  });
  return { service, writes };
}
const actor = { id: 'admin', name: 'Admin' };
test('give away requires recipient and preserves records with distinct history', async () => {
  const { service, writes } = fixture();
  await assert.rejects(service.dispose('asset', { action: 'GIVE_AWAY', quantity: 1, reason: 'Donation' }, actor), /recipient/);
  assert.equal(writes.length, 0);
  await service.dispose('asset', { action: 'GIVE_AWAY', quantity: 1, reason: 'Donation', recipient: 'School' }, actor);
  assert.equal(writes[0].status, 'DISPOSED');
  assert.match(writes[0].notes, /Original/);
  assert.match(writes[0].notes, /School/);
  assert.equal(writes[1].action, 'ASSET_GIVEN_AWAY');
  assert.equal(writes[1].assetUnitId, 'unit');
});
test('discard rejects unavailable or assigned units before any mutation', async () => {
  for (const options of [{ available: 0 }, { assigned: true }]) {
    const { service, writes } = fixture(options);
    await assert.rejects(service.dispose('asset', { action: 'DISCARD', quantity: 1, reason: 'Broken' }, actor), /available|assigned/);
    assert.equal(writes.length, 0);
  }
});
test('discard records a separate action and updates fully disposed parent', async () => {
  const { service, writes } = fixture();
  await service.dispose('asset', { action: 'DISCARD', quantity: 1, reason: 'Broken' }, actor);
  assert.equal(writes[1].action, 'ASSET_DISCARDED');
  assert.equal(writes[2].status, 'DISPOSED');
});
