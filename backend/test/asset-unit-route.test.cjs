require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PATH_METADATA, METHOD_METADATA } = require('@nestjs/common/constants');
const { RequestMethod } = require('@nestjs/common');
const { AssetsController } = require('../dist/modules/assets/assets.controller');
const { AssetUnitsService } = require('../dist/modules/assets/asset-units.service');

test('GET /assets/:id/units forwards the laptop asset ID to the units service', async () => {
  const rows = [{ id: 'laptop-unit', assetId: 'laptop', status: 'AVAILABLE' }];
  const controller = new AssetsController({}, { findByAsset: async id => { assert.equal(id, 'laptop'); return rows; } });
  assert.equal(Reflect.getMetadata(PATH_METADATA, AssetsController), 'assets');
  assert.equal(Reflect.getMetadata(PATH_METADATA, controller.findUnits), ':id/units');
  assert.equal(Reflect.getMetadata(METHOD_METADATA, controller.findUnits), RequestMethod.GET);
  assert.deepEqual(await controller.findUnits('laptop'), rows);
});
test('asset unit lookup returns the full array for only the selected asset', async () => {
  const rows = Array.from({ length: 125 }, (_, index) => ({ id: String(index), assetId: 'laptop' }));
  const service = Object.create(AssetUnitsService.prototype);
  service.assetModel = { findByPk: async id => id === 'laptop' ? { id } : null };
  service.assetUnitModel = { findAll: async query => { assert.deepEqual(query.where, { assetId: 'laptop' }); assert.equal(query.limit, undefined); return rows; } };
  assert.deepEqual(await service.findByAsset('laptop'), rows);
  await assert.rejects(service.findByAsset('missing'), /Asset not found/);
  service.assetUnitModel.findAll = async () => [];
  assert.deepEqual(await service.findByAsset('laptop'), []);
});
