require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EmployeesService } = require('../dist/modules/organisation/employees.service');
const { EmployeesController } = require('../dist/modules/organisation/employees.controller');
const { AssetAssignment } = require('../dist/modules/assets/models/asset-assignment.model');
const { System } = require('../dist/modules/assets/models/system.model');
const { PERMISSIONS_KEY } = require('../dist/common/decorator/roles.decorator');

test('deletion preserves history, blocks custody, and records deletion in the transaction', async () => {
  const oldAssignments = AssetAssignment.count, oldSystems = System.count;
  try {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const calls = [];
    let assigned = 0, computers = 0, missing = false;
    const employee = { id: 'e1', name: 'Ada', employeeCode: 'E1',
      update: async (data, options) => { assert.equal(options.transaction, transaction); calls.push('exit'); },
      destroy: async options => { assert.equal(options.transaction, transaction); assert.notEqual(options.force, true); calls.push('delete'); } };
    const service = Object.create(EmployeesService.prototype);
    service.employeeModel = { sequelize: { transaction: async callback => callback(transaction) }, findByPk: async () => missing ? null : employee };
    service.audit = { log: async (data, tx) => { assert.equal(tx, transaction); assert.equal(data.action, 'EMPLOYEE_DELETED'); calls.push('audit'); } };
    AssetAssignment.count = async () => assigned;
    System.count = async () => computers;
    assigned = 1;
    await assert.rejects(service.deleteRecord('e1', { id: 'admin' }), /Return all assigned/);
    assigned = 0; computers = 1;
    await assert.rejects(service.deleteRecord('e1', { id: 'admin' }), /Return all assigned/);
    assert.deepEqual(calls, []);
    computers = 0;
    assert.deepEqual(await service.deleteRecord('e1', { id: 'admin' }), { success: true });
    assert.deepEqual(calls, ['exit', 'delete', 'audit']);
    missing = true;
    await assert.rejects(service.deleteRecord('e1', { id: 'admin' }), /Employee not found/);
  } finally { AssetAssignment.count = oldAssignments; System.count = oldSystems; }
});

test('employee deletion requires write permission', () => {
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, EmployeesController.prototype.deleteRecord), ['assets:write']);
});
