const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CredentialCrypto } = require('../dist/modules/credentials/credential-crypto');
test('encrypts Unicode secrets with randomized authenticated ciphertext', () => {
  const crypto = new CredentialCrypto('ab'.repeat(32));
  const secret = '  pässword 🔐  ';
  const first = crypto.encrypt(secret, 'record:password');
  assert.equal(crypto.decrypt(first, 'record:password'), secret);
  assert.notEqual(first, crypto.encrypt(secret, 'record:password'));
  assert.ok(!first.includes(secret));
  assert.throws(() => crypto.decrypt(first, 'other:password'));
  assert.throws(() => new CredentialCrypto('cd'.repeat(32)).decrypt(first, 'record:password'));
  const parts = first.split('.');
  const bytes = Buffer.from(parts[3], 'base64'); bytes[0] ^= 1; parts[3] = bytes.toString('base64');
  assert.throws(() => crypto.decrypt(parts.join('.'), 'record:password'));
});
test('rejects missing or malformed encryption keys', () => {
  for (const value of ['', 'abc', 'z'.repeat(64)]) assert.throws(() => new CredentialCrypto(value));
});
test('vault actions enforce separate permissions and disable secret response caching', () => {
  require('reflect-metadata');
  const { CredentialsController } = require('../dist/modules/credentials/credentials.module');
  const { PERMISSIONS_KEY } = require('../dist/common/decorator/roles.decorator');
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, CredentialsController), ['credentials.read']);
  for (const action of ['create', 'update', 'remove']) {
    assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, CredentialsController.prototype[action]), ['credentials.read', 'credentials.manage']);
  }
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, CredentialsController.prototype.reveal), ['credentials.read', 'credentials.reveal']);
  for (const action of ['list', 'create', 'update', 'reveal']) {
    assert.ok(Reflect.getMetadata('__headers__', CredentialsController.prototype[action]).some(h => h.name === 'Cache-Control' && h.value === 'no-store'));
  }
});
test('partial updates reject null secrets and accept omitted passwords', async () => {
  const { plainToInstance } = require('class-transformer');
  const { validate } = require('class-validator');
  const { UpdateCredentialDto } = require('../dist/modules/credentials/credential.dto');
  assert.equal((await validate(plainToInstance(UpdateCredentialDto, { title: 'Email login' }))).length, 0);
  assert.ok((await validate(plainToInstance(UpdateCredentialDto, { password: null }))).length > 0);
  assert.ok((await validate(plainToInstance(UpdateCredentialDto, { password: '' }))).length > 0);
});
