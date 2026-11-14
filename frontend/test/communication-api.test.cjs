const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const source = filename.endsWith(`${path.sep}lib${path.sep}api.ts`) ? 'export const BACKEND = "http://localhost:4000/api";' : fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
};
const { configureStore } = require('@reduxjs/toolkit');
const { communicationApi: api, channelIds } = require('../src/services/api/communication.api.ts');

test('channel IDs accept database JSON and reject malformed values', () => {
  assert.deepEqual(channelIds('["channel-1",7]'), ['channel-1']);
  assert.deepEqual(channelIds('broken'), []);
  assert.deepEqual(channelIds(undefined), []);
});

test('communication requests preserve plans, partial workflow results and retry intent; mutations refresh status', async () => {
  const originalFetch = global.fetch;
  global.localStorage = { getItem: () => 'test-token' };
  const requests = [];
  const state = { employeeId: 'employee-1', workflow: { status: 'PARTIAL_FAILURE' }, tasks: [{ taskType: 'MAIL', status: 'COMPLETED' }, { taskType: 'CLIQ', status: 'FAILED' }], assignments: [], account: null, plan: null };
  global.fetch = async request => {
    assert.equal(request.headers.get('Authorization'), 'Bearer test-token');
    const url = new URL(request.url);
    const body = request.method === 'GET' ? undefined : await request.json();
    requests.push({ path: url.pathname, method: request.method, body });
    const response = url.pathname.endsWith('/profiles') ? { items: [{ id: 'profile-1', channelIds: '["channel-1"]' }] } : url.pathname.endsWith('/preview') ? { channelIds: ['channel-1'], channels: [] } : state;
    return new Response(JSON.stringify(response), { headers: { 'Content-Type': 'application/json' } });
  };
  const store = configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: defaults => defaults().concat(api.middleware) });
  const status = store.dispatch(api.endpoints.employeeCommunication.initiate('employee-1'));
  try {
    await status.unwrap();
    const profiles = store.dispatch(api.endpoints.communicationProfiles.initiate());
    assert.deepEqual((await profiles.unwrap()).items[0].channelIds, ['channel-1']);
    profiles.unsubscribe();
    const body = { profileId: 'profile-1', addChannelIds: ['channel-2'], removeChannelIds: ['channel-3'] };
    await store.dispatch(api.endpoints.previewCommunicationPlan.initiate({ employeeId: 'employee-1', body })).unwrap();
    assert.deepEqual(requests.find(r => r.path.endsWith('/preview')).body, body);
    const retryBody = { idempotencyKey: 'retry_key_123', step: 'CLIQ' };
    const result = await store.dispatch(api.endpoints.provisionCommunication.initiate({ employeeId: 'employee-1', operation: 'retry', body: retryBody })).unwrap();
    assert.equal(result.workflow.status, 'PARTIAL_FAILURE');
    assert.equal(result.tasks[0].status, 'COMPLETED');
    assert.deepEqual(requests.find(r => r.path.endsWith('/retry')).body, retryBody);
    await Promise.all(store.dispatch(api.util.getRunningQueriesThunk()));
    assert.ok(requests.filter(r => r.path.endsWith('/status')).length >= 2);
  } finally {
    status.unsubscribe(); store.dispatch(api.util.resetApiState()); global.fetch = originalFetch; delete global.localStorage;
  }
});
