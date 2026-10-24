require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { CreateAssetUnitInputDto } = require('../dist/modules/assets/dto/create-asset.dto');
const { CreateAssetUnitDto, UpdateAssetUnitDto } = require('../dist/modules/assets/asset-units.controller');
const { AssetsService } = require('../dist/modules/assets/assets.service');
const { AssetUnitsService } = require('../dist/modules/assets/asset-units.service');
const identities = [{ imei: '123456789012345', simNumber: '001234567890' }, { imei: '987654321098765', simNumber: '+919876543210' }];

test('all unit entry points validate multiple IMEIs and SIMs as strings', async () => {
  for (const Dto of [CreateAssetUnitInputDto, CreateAssetUnitDto, UpdateAssetUnitDto]) {
    assert.equal((await validate(plainToInstance(Dto, { cellularIdentities: identities }))).length, 0);
    assert.equal((await validate(plainToInstance(Dto, {}))).length, 0);
    assert.equal((await validate(plainToInstance(Dto, { cellularIdentities: [] }))).length, 0);
    for (const invalid of [{ imei: '123' }, { imei: 123456789012345 }, { simNumber: 'x'.repeat(65) }]) {
      assert.ok((await validate(plainToInstance(Dto, { cellularIdentities: [invalid] }))).length);
    }
  }
});

test('asset creation stores identifiers on the correct physical units', async () => {
  const service = Object.create(AssetsService.prototype);
  const writes = [];
  const transaction = {};
  service.assetUnitModel = { create: async (data, options) => {
    assert.equal(options.transaction, transaction); writes.push(data); return data;
  } };
  await service.createAssetUnits({ id: 'phone', assetTag: 'PHONE' }, 2, transaction, {
    initialUnits: [{ serialNumber: 'SN1', deviceId: 'DEVICE-001', pcPassword: ' secret ', cellularIdentities: identities }, { serialNumber: 'SN2' }],
  });
  assert.equal(writes[0].serialNumber, 'SN1');
  assert.equal(writes[0].deviceId, 'DEVICE-001');
  assert.equal(writes[0].pcPassword, ' secret ');
  assert.deepEqual(writes[0].cellularIdentities, identities);
  assert.equal(writes[0].cellularIdentities[0].simNumber, '001234567890');
  assert.deepEqual(writes[1].cellularIdentities, []);
});

test('unit editing can replace and clear cellular identifiers without altering custody', async () => {
  const service = Object.create(AssetUnitsService.prototype);
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const unit = { id: 'unit', assetId: 'phone', serialNumber: 'SN1', status: 'ASSIGNED', cellularIdentities: identities,
    update: async (data, options) => { assert.equal(options.transaction, transaction); Object.assign(unit, data); } };
  Object.assign(service, {
    sequelize: { transaction: async callback => callback(transaction) },
    assetUnitModel: { findByPk: async () => unit },
    assetModel: { findByPk: async () => ({ id: 'phone' }) },
    audit: { log: async data => { assert.ok(!JSON.stringify(data).includes("top-secret")); } },
  });
  await service.update('unit', { deviceId: 'PC-001', pcPassword: 'top-secret', cellularIdentities: [identities[1]] }, { id: 'admin' });
  assert.deepEqual(unit.cellularIdentities, [identities[1]]);
  assert.equal(unit.serialNumber, 'SN1');
  assert.equal(unit.status, 'ASSIGNED');
  await service.update('unit', {}, { id: 'admin' });
  assert.deepEqual(unit.cellularIdentities, [identities[1]]);
  await service.update('unit', { cellularIdentities: [] }, { id: 'admin' });
  assert.deepEqual(unit.cellularIdentities, []);
});
