require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Sequelize, Model } = require('sequelize-typescript');
const { AssetsService } = require('../dist/modules/assets/assets.service');
const { Asset } = require('../dist/modules/assets/models/asset.model');

test('asset pagination selects only grouped asset IDs and then loads full records', async () => {
  function files(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
      entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
  }
  const models = files(path.resolve(__dirname, '../dist/modules'))
    .filter(file => file.endsWith('.model.js'))
    .flatMap(file => Object.values(require(file)).filter(value => typeof value === 'function' && value.prototype instanceof Model));
  const db = new Sequelize({ dialect: 'mysql', models, logging: false });
  const statements = [];
  // Use the real Sequelize MySQL query generator without a database connection.
  db.query = async sql => { statements.push(sql); return [{ id: 'asset-b' }, { id: 'asset-a' }]; };
  const service = Object.create(AssetsService.prototype);
  const fullQueries = [];
  Object.assign(service, {
    sequelize: db,
    assetModel: { findAll: async options => {
      if (options.attributes) return Asset.findAll(options);
      fullQueries.push(options);
      return [{ id: 'asset-a', units: [{ id: 'unit-1' }, { id: 'unit-2' }] }, { id: 'asset-b', units: [] }];
    } },
  });
  try {
    for (const search of [undefined, 'Ada']) {
      statements.length = 0;
      const result = await service.findAll({ page: 1, pageSize: 100, search });
      assert.equal(statements.length, 2);
      for (const sql of statements) {
        assert.equal(sql.slice(0, sql.indexOf(' FROM ')), 'SELECT `Asset`.`id`');
        assert.match(sql, /GROUP BY `Asset`.`id`/);
        assert.match(sql, /JOIN `asset_units`/);
      }
      assert.match(statements[1], /LIMIT 0, 100/);
      assert.deepEqual(result.items.map(item => item.id), ['asset-b', 'asset-a']);
      assert.equal(result.items[1].units.length, 2);
      assert.equal(result.total, 2);
      const hydration = fullQueries.at(-1);
      assert.equal(hydration.limit, undefined);
      assert.ok(hydration.include.find(include => include.as === 'units').attributes === undefined);
    }
  } finally {
    await db.close();
  }
});
