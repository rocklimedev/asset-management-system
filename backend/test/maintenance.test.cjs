require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AssetUnitsService } = require('../dist/modules/assets/asset-units.service');
function fixture(status = 'AVAILABLE', assigned = false) {
 const service = Object.create(AssetUnitsService.prototype), writes = [];
 const tx = { LOCK: { UPDATE: 'UPDATE' } };
 const unit = { id: 'unit', assetId: 'asset', status, notes: 'Existing note', update: async (values, options) => { assert.equal(options.transaction, tx); writes.push(['unit', values]); Object.assign(unit, values); } };
 Object.assign(service, {
  sequelize: { transaction: async fn => fn(tx) },
  assetUnitModel: { findByPk: async () => unit },
  assetAssignmentModel: { findOne: async () => assigned ? { id: 'assignment' } : null },
  assetHistoryModel: { create: async (values, options) => { assert.equal(options.transaction, tx); writes.push(['history', values]); } },
  audit: { log: async () => {} },
  syncParentAsset: async (id, transaction) => { assert.equal(id, 'asset'); assert.equal(transaction, tx); writes.push(['sync']); },
  findOne: async () => unit,
 });
 return { service, unit, writes };
}
const actor = { id: 'admin', name: 'Admin' };
test('starting maintenance saves issue notes and records the unit transition', async () => {
 const { service, unit, writes } = fixture();
 await service.changeStatus('unit', 'REPAIR', actor, 'Fan replacement with vendor');
 assert.equal(unit.status, 'REPAIR'); assert.equal(unit.notes, 'Fan replacement with vendor');
 assert.equal(writes[1][1].fromValue, 'AVAILABLE'); assert.equal(writes[1][1].toValue, 'REPAIR');
 assert.equal(writes[1][1].notes, unit.notes); assert.equal(writes[1][1].assetUnitId, 'unit'); assert.equal(writes[2][0], 'sync');
});
test('completed repairs return units to available with completion history', async () => {
 const { service, unit, writes } = fixture('REPAIR');
 await service.changeStatus('unit', 'AVAILABLE', actor, 'Replaced fan; tested successfully');
 assert.equal(unit.status, 'AVAILABLE'); assert.equal(writes[1][1].fromValue, 'REPAIR'); assert.match(writes[1][1].notes, /tested successfully/);
});
test('assigned equipment cannot enter maintenance before it is returned', async () => {
 const { service, writes } = fixture('ASSIGNED', true);
 await assert.rejects(service.changeStatus('unit', 'REPAIR', actor, 'Repair needed'), /Return the active assignment/); assert.equal(writes.length, 0);
});
test('status changes without notes preserve existing unit notes', async () => {
 const { service, unit } = fixture('REPAIR'); await service.changeStatus('unit', 'DAMAGED', actor); assert.equal(unit.notes, 'Existing note');
});
