require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Sequelize, Model } = require('sequelize-typescript');
const { EmployeesService } = require('../dist/modules/organisation/employees.service');
const { Employee } = require('../dist/modules/organisation/models/employees.model');

test('employee details validate nested asset and software license associations', async () => {
  function files(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
      entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
  }
  const models = files(path.resolve(__dirname, '../dist/modules'))
    .filter(file => file.endsWith('.model.js'))
    .flatMap(file => Object.values(require(file)).filter(value =>
      typeof value === 'function' && value.prototype instanceof Model));
  const db = new Sequelize({ dialect: 'mysql', models, logging: false });
  const service = Object.create(EmployeesService.prototype);
  service.employeeModel = Employee;
  const statements = [];
  // Exercise actual alias inference, association validation and MySQL SQL generation.
  // No database connection is needed; simulate an empty employee lookup.
  db.query = async sql => { statements.push(sql); return null; };
  try {
    await assert.rejects(service.findOne('employee-id'), /Employee not found/);
    assert.equal(statements.length, 1);
    assert.match(statements[0], /LEFT OUTER JOIN `software_licenses` AS `assignments->asset->licenses`/);
  } finally {
    await db.close();
  }
});
