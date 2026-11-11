const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = filename.endsWith(`${path.sep}lib${path.sep}api.ts`)
    ? 'export const BACKEND = "http://localhost:4000/api";'
    : fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};

test('activity filters produce distinct server requests and reset clears query parameters', async () => {
  const requests = [];
  const originalFetch = global.fetch;
  global.localStorage = { getItem: () => 'test-token' };
  global.fetch = async request => {
    const url = new URL(request.url);
    requests.push(url);
    assert.equal(request.headers.get('Authorization'), 'Bearer test-token');
    return new Response(JSON.stringify({ items: [], total: 0, page: Number(url.searchParams.get('page')), pageSize: 50 }), { headers: { 'Content-Type': 'application/json' } });
  };
  const { configureStore } = require('@reduxjs/toolkit');
  const { activityApi } = require('../src/services/api/activity.api.ts');
  const store = configureStore({ reducer: { [activityApi.reducerPath]: activityApi.reducer }, middleware: defaults => defaults().concat(activityApi.middleware) });
  try {
    for (const filters of [
      { page: 2 },
      { page: 1, search: 'Asset Created', entity: 'Asset', from: '2026-11-01', to: '2026-11-11' },
      { page: 1 },
    ]) {
      const result = store.dispatch(activityApi.endpoints.getActivityLogs.initiate(filters));
      await result.unwrap();
      result.unsubscribe();
    }
    assert.equal(requests.length, 3);
    assert.equal(requests[1].searchParams.get('search'), 'Asset Created');
    assert.equal(requests[1].searchParams.get('entity'), 'Asset');
    assert.equal(requests[1].searchParams.get('from'), '2026-11-01');
    assert.equal(requests[1].searchParams.get('to'), '2026-11-11');
    assert.equal(requests[1].searchParams.get('page'), '1');
    assert.equal(requests[2].searchParams.toString(), 'page=1');
  } finally {
    store.dispatch(activityApi.util.resetApiState());
    global.fetch = originalFetch;
    delete global.localStorage;
  }
});
