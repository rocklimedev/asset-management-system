const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Load the application's TypeScript APIs in Node; only Vite's URL config
// needs replacing. These tests exercise the real Redux store and RTK cache.
require.extensions['.ts'] = (module, filename) => {
  const source = filename.endsWith(`${require('node:path').sep}lib${require('node:path').sep}api.ts`)
    ? 'export const BACKEND = "http://localhost:4000/api"; export const API_URL = BACKEND;'
    : fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};

const { store } = require('../src/services/store/index.ts');
const { employeesApi } = require('../src/services/api/employees.api.ts');

for (const endpointName of ['createAsset', 'updateAsset', 'updateAssetUnit', 'assignAsset', 'returnAsset', 'transferAsset', 'assignSystem', 'returnSystem', 'releaseAssetsForEmployee']) {
  test(`${endpointName} refreshes employee board and employee details`, async () => {
    store.dispatch(employeesApi.util.resetApiState());
    const employee = { id: 'employee', name: 'Ada', status: 'ACTIVE', systems: [], assignments: [] };
    await store.dispatch(employeesApi.util.upsertQueryData('getEmployees', {}, { items: [employee] }));
    await store.dispatch(employeesApi.util.upsertQueryData('getEmployee', 'employee', employee));
    assert.equal(Object.keys(store.getState().employeesApi.queries).length, 2);

    store.dispatch({
      type: 'assetApi/executeMutation/fulfilled',
      payload: { id: 'asset' },
      meta: {
        requestStatus: 'fulfilled', requestId: `test-${endpointName}`,
        arg: { type: 'mutation', endpointName, originalArgs: { id: 'asset', assignEmployeeId: 'employee', employeeId: 'employee', systemId: null } },
      },
    });

    // Unsubscribed stale entries are removed; mounted views would refetch.
    assert.equal(Object.keys(store.getState().employeesApi.queries).length, 0);
    store.dispatch(employeesApi.util.resetApiState());
  });
}

test('a failed asset creation keeps employee data cached', async () => {
  await store.dispatch(employeesApi.util.upsertQueryData('getEmployees', {}, { items: [] }));
  store.dispatch({
    type: 'assetApi/executeMutation/rejected',
    meta: { requestStatus: 'rejected', requestId: 'failed', arg: { type: 'mutation', endpointName: 'createAsset' } },
    error: { message: 'Failed' },
  });
  assert.equal(Object.keys(store.getState().employeesApi.queries).length, 1);
  store.dispatch(employeesApi.util.resetApiState());
});
