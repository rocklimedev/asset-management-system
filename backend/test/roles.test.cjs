require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RolesController, CreateRoleDto, RolePermissionsDto } = require('../dist/modules/roles/roles.controller');
const { PERMISSIONS_KEY } = require('../dist/common/decorator/roles.decorator');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { Op } = require('sequelize');
const permissions = [
  { id: '005b5fd2-b35a-11f1-b327-52540021303b', key: 'roles.manage' },
  { id: '2d8d1ff2-a826-11f1-b0a5-52540021303b', key: 'credentials.read' },
  { id: '2d8d2941-a826-11f1-b0a5-52540021303b', key: 'credentials.reveal' },
];
function setup(name = 'manager', own = false) {
  const calls = [];
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const roles = {
    sequelize: { transaction: async callback => callback(transaction) },
    findByPk: async () => ({ id: 'target', name }),
    create: async (values, options) => { calls.push(['create', options]); return { id: 'created', ...values }; },
  };
  const catalog = {
    findAll: async ({ where }) => permissions.filter(p => where.id[Op.in].includes(p.id)),
    count: async () => permissions.length,
  };
  const grants = { destroy: async options => calls.push(['destroy', options]), bulkCreate: async (rows, options) => calls.push(['grants', options, rows]) };
  const audit = { log: async (entry, tx) => calls.push(['audit', { transaction: tx }, entry]) };
  return { controller: new RolesController(roles, catalog, grants, audit), calls, transaction, user: { id: 'actor', roleId: own ? 'target' : 'other' } };
}
test('role mutations and permission catalog require roles.manage', () => {
  for (const action of ['create', 'setPermissions', 'permissions']) assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, RolesController.prototype[action]), ['roles.manage']);
});
test('DTO validation rejects duplicate IDs, malformed IDs and invalid names', async () => {
  for (const body of [{ permissionIds: ['invalid'] }, { permissionIds: [permissions[0].id, permissions[0].id] }, { permissionIds: null }]) {
    assert.ok((await validate(plainToInstance(RolePermissionsDto, body))).length);
  }
  assert.ok((await validate(plainToInstance(CreateRoleDto, { name: 'INVALID NAME', description: '', permissionIds: [] }))).length);
  assert.equal((await validate(plainToInstance(CreateRoleDto, { name: 'helpdesk_operator', description: 'Support', permissionIds: [] }))).length, 0);
});
test('unknown permissions cannot delete existing grants', async () => {
  const { controller, calls, user } = setup();
  await assert.rejects(controller.setPermissions('target', { permissionIds: ['missing'] }, user), /no longer exist/);
  assert.equal(calls.length, 0);
});
test('credential reveal requires read', async () => {
  const { controller, calls, user } = setup();
  await assert.rejects(controller.setPermissions('target', { permissionIds: [permissions[2].id] }, user), /require credentials.read/);
  assert.equal(calls.length, 0);
});
test('admin and developer cannot lose registered permissions', async () => {
  for (const name of ['admin', 'developer']) {
    const { controller, calls, user } = setup(name);
    await assert.rejects(controller.setPermissions('target', { permissionIds: [] }, user), /retain all/);
    assert.equal(calls.length, 0);
  }
});
test('cannot remove role management from your own role', async () => {
  const { controller, calls, user } = setup('manager', true);
  await assert.rejects(controller.setPermissions('target', { permissionIds: [] }, user), /own ability/);
  assert.equal(calls.length, 0);
});
test('permission replacement and audit use the same transaction, including clearing grants', async () => {
  const { controller, calls, user, transaction } = setup();
  await controller.setPermissions('target', { permissionIds: [] }, user);
  assert.deepEqual(calls.map(call => call[0]), ['destroy', 'grants', 'audit']);
  assert.ok(calls.every(call => call[1].transaction === transaction));
  assert.deepEqual(calls[1][2], []);
});
test('new role creation saves selected grants and audit in one transaction', async () => {
  const { controller, calls, user, transaction } = setup();
  const role = await controller.create({ name: 'helpdesk_operator', description: ' Support ', permissionIds: [permissions[1].id] }, user);
  assert.equal(role.description, 'Support');
  assert.deepEqual(calls.map(call => call[0]), ['create', 'grants', 'audit']);
  assert.ok(calls.every(call => call[1].transaction === transaction));
  assert.equal(calls[1][2][0].roleId, role.id);
});
