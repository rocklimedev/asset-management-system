const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync(require.resolve('../src/components/users/permissions-matrix.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const loaded = { exports: {} };
new Function('exports', 'require', 'module', compiled)(loaded.exports, require, loaded);
const { toggleGrant } = loaded.exports;
const permissions = [
  { id: 'read', key: 'credentials.read' },
  { id: 'manage', key: 'credentials.manage' },
  { id: 'reveal', key: 'credentials.reveal' },
  { id: 'other', key: 'roles.manage' },
];

test('granting credential manage or reveal also grants read without changing other permissions', () => {
  for (const permission of permissions.slice(1, 3)) {
    const original = ['other'];
    assert.deepEqual(new Set(toggleGrant(original, permission, true, permissions)), new Set(['other', permission.id, 'read']));
    assert.deepEqual(original, ['other']);
  }
});

test('revoking credential read removes dependent grants and retains unrelated permissions', () => {
  assert.deepEqual(toggleGrant(['read', 'manage', 'reveal', 'other'], permissions[0], false, permissions), ['other']);
  assert.deepEqual(toggleGrant(['read', 'manage', 'other'], permissions[1], false, permissions), ['read', 'other']);
});

test('repeated grant toggles do not duplicate IDs or remove unseen grants', () => {
  assert.deepEqual(toggleGrant(['other', 'unseen'], permissions[3], true, permissions), ['other', 'unseen']);
  assert.deepEqual(toggleGrant(['other', 'unseen'], permissions[3], false, permissions), ['unseen']);
});
