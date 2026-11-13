const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
 const source = filename.endsWith(require('node:path').sep + 'lib' + require('node:path').sep + 'api.ts') ? 'export const BACKEND = "http://localhost:4000/api";' : fs.readFileSync(filename, 'utf8');
 module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
};
const { configureStore } = require('@reduxjs/toolkit');
const { assetApi } = require('../src/services/api/asset.api.ts');
test('unit list and maintenance mutations use backend asset-units routes', async () => {
 const previousFetch = global.fetch, previousStorage = global.localStorage;
 const calls = [];
 global.localStorage = { getItem: () => null };
 global.fetch = async request => {
  calls.push({ url: request.url, method: request.method, body: request.method === 'GET' ? undefined : await request.json() });
  return new Response(JSON.stringify(request.method === 'GET' ? { items: [], total: 0, page: 1, totalPages: 0 } : { id: 'unit', assetId: 'asset' }), { headers: { 'Content-Type': 'application/json' } });
 };
 const store = configureStore({ reducer: { [assetApi.reducerPath]: assetApi.reducer }, middleware: getDefault => getDefault().concat(assetApi.middleware) });
 try {
  await store.dispatch(assetApi.endpoints.getAssetUnits.initiate({ status: 'DAMAGED', page: 1, pageSize: 1 }, { subscribe: false })).unwrap();
  const list = new URL(calls[0].url);
  assert.equal(list.pathname, '/api/asset-units'); assert.equal(list.searchParams.get('status'), 'DAMAGED'); assert.equal(list.searchParams.get('pageSize'), '1');
  await store.dispatch(assetApi.endpoints.updateAssetUnitStatus.initiate({ id: 'unit', status: 'REPAIR', notes: 'Repair fan' })).unwrap();
  assert.equal(new URL(calls[1].url).pathname, '/api/asset-units/unit/status'); assert.equal(calls[1].method, 'PATCH'); assert.equal(calls[1].body.status, 'REPAIR');
  await store.dispatch(assetApi.endpoints.createAssetUnit.initiate({ assetId: 'asset', serialNumber: 'SN1' })).unwrap();
  assert.equal(new URL(calls[2].url).pathname, '/api/asset-units/asset/asset'); assert.equal(calls[2].body.assetId, undefined); assert.equal(calls[2].body.serialNumber, 'SN1');
  await store.dispatch(assetApi.endpoints.updateAssetUnitLocation.initiate({ id: 'unit', locationId: 'location' })).unwrap();
  assert.equal(new URL(calls[3].url).pathname, '/api/asset-units/unit'); assert.equal(calls[3].body.locationId, 'location');
 } finally { store.dispatch(assetApi.util.resetApiState()); global.fetch = previousFetch; global.localStorage = previousStorage; }
});
