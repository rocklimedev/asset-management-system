require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { AuthService } = require('../dist/modules/auth/auth.service');

test('profile editing updates only name and email for the signed-in account', async () => {
  const user = { id: 'self', status: 'ACTIVE', roleId: 'admin', passwordHash: 'secret',
    update: async values => { assert.deepEqual(values, { name: 'Ada', email: 'ada@example.com' }); Object.assign(user, values); } };
  const service = new AuthService({ findByPk: async id => { assert.equal(id, 'self'); return user; } }, {});
  assert.deepEqual(await service.updateProfile('self', 'Ada', 'ada@example.com'), { id: 'self', name: 'Ada', email: 'ada@example.com' });
  assert.equal(user.roleId, 'admin');
  assert.equal(user.passwordHash, 'secret');
});

test('profile editing rejects unavailable accounts and duplicate emails', async () => {
  const { UniqueConstraintError } = require('sequelize');
  for (const user of [null, { status: 'DISABLED' }]) {
    const service = new AuthService({ findByPk: async () => user }, {});
    await assert.rejects(service.updateProfile('self', 'Ada', 'ada@example.com'), /Account is unavailable/);
  }
  const service = new AuthService({ findByPk: async () => ({ status: 'ACTIVE', update: async () => { throw new UniqueConstraintError({}); } }) }, {});
  await assert.rejects(service.updateProfile('self', 'Ada', 'ada@example.com'), /already in use/);
});

test('password reset verifies the current password and updates only the authenticated active user', async () => {
  const hash = await bcrypt.hash('old-password', 4);
  let updates = 0;
  const service = new AuthService({
    findByPk: async id => { assert.equal(id, 'user-1'); return { status: 'ACTIVE', passwordHash: hash }; },
    update: async (values, options) => {
      updates++;
      assert.deepEqual(options.where, { id: 'user-1', passwordHash: hash, status: 'ACTIVE' });
      assert(await bcrypt.compare('new-password', values.passwordHash));
      return [1];
    },
  }, {});
  await assert.rejects(service.resetPassword('user-1', 'wrong', 'new-password'), /Current password is incorrect/);
  await assert.rejects(service.resetPassword('user-1', 'old-password', 'old-password'), /different/);
  await assert.rejects(service.resetPassword('user-1', 'old-password', '😀'.repeat(30)), /72 bytes/);
  assert.equal(updates, 0);
  await service.resetPassword('user-1', 'old-password', 'new-password');
  assert.equal(updates, 1);
});

test('disabled and missing accounts cannot reset passwords', async () => {
  for (const user of [null, { status: 'DISABLED' }]) {
    const service = new AuthService({ findByPk: async () => user }, {});
    await assert.rejects(service.resetPassword('user', 'old-password', 'new-password'), /Account is unavailable/);
  }
});
