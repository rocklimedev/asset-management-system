require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AssetsService } = require('../dist/modules/assets/assets.service');
const { QuickCreateAssetDto } = require('../dist/modules/assets/dto/quick-create-asset.dto');
const { validate } = require('class-validator');

function setup(category = null, existing = null) {
  const service = Object.create(AssetsService.prototype);
  const created = [], defaults = [], searches = [];
  Object.assign(service, {
    assetCategoryModel: {
      findByPk: async () => category,
      findOrCreate: async options => { defaults.push(options); return [options.defaults, true]; },
    },
    organisationModel: { findByPk: async id => ({ id }) },
    assetModel: { findOne: async options => { searches.push(options); return existing; } },
    create: async (dto, actor) => { created.push({ dto, actor }); return { id: 'new-asset', ...dto }; },
  });
  return { service, created, defaults, searches };
}

test('name-only creation defaults to one available hardware item and a stable general category', async () => {
  const { service, created, defaults } = setup();
  const actor = { id: 'user' };
  await service.quickCreate({ name: '  USB Cable  ' }, actor);
  await service.quickCreate({ name: 'Mouse' }, actor);
  assert.equal(created[0].dto.name, 'USB Cable');
  assert.equal(created[0].dto.quantity, 1);
  assert.equal(created[0].dto.kind, 'HARDWARE');
  assert.equal(created[0].dto.status, 'AVAILABLE');
  assert.equal(created[0].dto.condition, 'GOOD');
  assert.equal(created[0].actor, actor);
  assert.equal(defaults[0].defaults.name, 'General Hardware');
  assert.equal(defaults[0].where.id, defaults[1].where.id);
  assert.match(defaults[0].where.id, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/);
});

test('selected category supplies type and organisation and preserves selected location', async () => {
  const { service, created, defaults } = setup({ id: 'category', type: 'SOFTWARE', organisationId: 'org' });
  await service.quickCreate({ name: 'Editor', categoryId: 'category', locationId: 'location' }, {});
  assert.equal(created[0].dto.kind, 'SOFTWARE');
  assert.equal(created[0].dto.organisationId, 'org');
  assert.equal(created[0].dto.categoryId, 'category');
  assert.equal(created[0].dto.locationId, 'location');
  assert.equal(defaults.length, 0);
});

test('existing catalogue assets are rejected even when no stock is available', async () => {
  const { service, created, defaults, searches } = setup(null, { id: 'existing', quantity: 1, quantityAssigned: 1 });
  await assert.rejects(service.quickCreate({ name: 'Laptop' }, {}), /already exists/);
  assert.equal(searches[0].where.status, undefined);
  assert.equal(created.length, 0);
  assert.equal(defaults.length, 0);
});

test('mismatched category and invalid names cannot create an asset', async () => {
  const { service, created } = setup({ id: 'category', type: 'SOFTWARE' });
  await assert.rejects(service.quickCreate({ name: 'Mouse', kind: 'HARDWARE', categoryId: 'category' }, {}), /does not match/);
  await assert.rejects(service.quickCreate({ name: '   ' }, {}), /asset name/);
  assert.equal(created.length, 0);
  assert.ok((await validate(Object.assign(new QuickCreateAssetDto(), { name: '   ' }))).length);
  assert.ok((await validate(Object.assign(new QuickCreateAssetDto(), { name: 'x'.repeat(151) }))).length);
});
