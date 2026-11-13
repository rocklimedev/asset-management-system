require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { UniqueConstraintError } = require('sequelize');
const { UsersService } = require('../dist/modules/users/users.service');

function setup({ missingEmployee = false, linkedUserId, race = false } = {}) {
  const events = [];
  const user = { id: 'user', name: 'Ada', email: 'ada@example.com', employeeId: 'old-employee',
    update: async values => { if (race) throw new UniqueConstraintError({}); Object.assign(user, values); } };
  const users = {
    findByPk: async () => user,
    findOne: async ({ where }) => where.employeeId && linkedUserId ? { id: linkedUserId } : null,
    create: async values => { if (race) throw new UniqueConstraintError({}); Object.assign(user, values); return user; },
  };
  const employees = { findByPk: async () => missingEmployee ? null : { id: 'employee' } };
  return { service: new UsersService(users, { log: async event => events.push(event) }, employees), user, events };
}

test('create user links an existing employee and includes employee details in user queries', async () => {
  const { service, user, events } = setup();
  await service.create({ name: 'Ada', email: 'ada@example.com', password: 'password123', roleId: 'role', employeeId: 'employee' }, { id: 'admin' });
  assert.equal(user.employeeId, 'employee');
  assert.equal(events[0].metadata.employeeId, 'employee');
  assert(service.getUserInclude().some(include => include.as === 'employee'));
});

test('update can link, retain, and unlink an employee, recording previous and new links', async () => {
  const { service, user, events } = setup({ linkedUserId: 'user' });
  await service.update('user', { employeeId: 'employee' }, { id: 'admin' });
  assert.equal(user.employeeId, 'employee');
  assert.equal(events[0].metadata.previousEmployeeId, 'old-employee');
  assert.equal(events[0].metadata.employeeId, 'employee');
  await service.update('user', { name: 'Ada Updated' }, { id: 'admin' });
  assert.equal(user.employeeId, 'employee');
  await service.update('user', { employeeId: null }, { id: 'admin' });
  assert.equal(user.employeeId, null);
  assert.equal(events[2].metadata.previousEmployeeId, 'employee');
  assert.equal(events[2].metadata.employeeId, null);
});

test('missing employees and employees linked to another user are rejected without updates', async () => {
  for (const [options, message] of [[{ missingEmployee: true }, /Employee not found/], [{ linkedUserId: 'other-user' }, /already linked/]]) {
    const { service, user, events } = setup(options);
    await assert.rejects(service.update('user', { employeeId: 'employee' }, { id: 'admin' }), message);
    await assert.rejects(service.create({ employeeId: 'employee' }, { id: 'admin' }), message);
    assert.equal(user.employeeId, 'old-employee');
    assert.equal(events.length, 0);
  }
});

test('concurrent duplicate links return a conflict and do not log a successful update', async () => {
  const { service, events } = setup({ race: true });
  await assert.rejects(service.update('user', { employeeId: 'employee' }, { id: 'admin' }), error => error.getStatus() === 409);
  assert.equal(events.length, 0);
});

test('employee picker includes linked user IDs and requests only employee summary fields', async () => {
  const service = new UsersService({ findAll: async () => [{ id: 'linked-user', employeeId: 'employee' }] }, {}, {
    findAll: async options => {
      assert.deepEqual(options.attributes, ['id', 'name', 'employeeCode', 'email', 'status']);
      return [{ id: 'employee', get: () => ({ id: 'employee', name: 'Ada', employeeCode: 'EMP1' }) }];
    },
  });
  assert.deepEqual(await service.employeeOptions(), [{ id: 'employee', name: 'Ada', employeeCode: 'EMP1', linkedUserId: 'linked-user' }]);
});
