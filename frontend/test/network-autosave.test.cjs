const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText, filename);
const { NetworkAutosave } = require('../src/components/network/autosave.ts');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
};
const initial = { revision: 1, snapshot: 'original' };
const fail = (status) => Object.assign(new Error('Save rejected'), { status });

test('debounces rapid edits and saves only the newest document automatically', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [];
  const saver = new NetworkAutosave(initial, async (snapshot, revision) => {
    calls.push({ snapshot, revision });
    return { snapshot, revision: revision + 1 };
  }, async () => initial, () => {});
  saver.update('first');
  t.mock.timers.tick(400);
  saver.update('latest');
  t.mock.timers.tick(649);
  assert.equal(calls.length, 0);
  t.mock.timers.tick(1);
  await saver.flush();
  assert.deepEqual(calls, [{ snapshot: 'latest', revision: 1 }]);
  await saver.dispose();
});

test('serializes saves, coalesces queued edits, and uses the acknowledged revision', async () => {
  const first = deferred(), calls = [], notices = [];
  const saver = new NetworkAutosave(initial, async (snapshot, revision) => {
    calls.push({ snapshot, revision });
    return calls.length === 1 ? first.promise : { snapshot, revision: revision + 1 };
  }, async () => initial, (...args) => notices.push(args), 60000);
  saver.update('first');
  const pending = saver.flush();
  saver.update('second'); saver.update('third');
  assert.equal(saver.flush(), pending);
  assert.equal(calls.length, 1);
  first.resolve({ snapshot: 'first', revision: 2 });
  await pending;
  assert.equal(notices.at(-1)[0], 'pending');
  assert.equal(notices.at(-1)[1].snapshot, 'first');
  await saver.flush();
  assert.deepEqual(calls, [{ snapshot: 'first', revision: 1 }, { snapshot: 'third', revision: 2 }]);
  assert.equal(notices.at(-1)[0], 'saved');
  await saver.dispose();
});

test('undo during an in-flight save is persisted after that save completes', async () => {
  const first = deferred(), calls = [];
  const saver = new NetworkAutosave(initial, async (snapshot, revision) => {
    calls.push({ snapshot, revision });
    return calls.length === 1 ? first.promise : { snapshot, revision: revision + 1 };
  }, async () => initial, () => {}, 60000);
  saver.update('edit'); const pending = saver.flush();
  saver.update('original');
  first.resolve({ snapshot: 'edit', revision: 2 }); await pending;
  await saver.flush();
  assert.deepEqual(calls.at(-1), { snapshot: 'original', revision: 2 });
  await saver.dispose();
});

test('recovers a lost success response before sending the next queued edit', async () => {
  const calls = [], notices = [];
  const saver = new NetworkAutosave(initial, async (snapshot, revision) => {
    calls.push({ snapshot, revision });
    if (calls.length === 1) throw new Error('Connection dropped');
    return { snapshot, revision: revision + 1 };
  }, async () => ({ snapshot: 'edit', revision: 2 }), (...args) => notices.push(args), 60000);
  saver.update('edit'); await saver.flush();
  assert.equal(notices.at(-1)[0], 'saved');
  saver.update('next'); await saver.flush();
  assert.deepEqual(calls.at(-1), { snapshot: 'next', revision: 2 });
  await saver.dispose();
});

test('remote revision conflicts pause all later writes without acknowledging local edits', async () => {
  let writes = 0; const notices = [];
  const saver = new NetworkAutosave(initial, async () => { writes++; throw fail(409); },
    async () => ({ snapshot: 'someone else', revision: 2 }), (...args) => notices.push(args), 60000);
  saver.update('my edit'); await saver.flush();
  assert.equal(notices.at(-1)[0], 'conflict');
  assert.equal(notices.at(-1)[1], undefined);
  saver.update('more local edits'); await saver.flush();
  assert.equal(writes, 1);
  await saver.dispose();
});

test('transient failures retry automatically with the same revision and newest edits', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const calls = [], notices = [];
  const saver = new NetworkAutosave(initial, async (snapshot, revision) => {
    calls.push({ snapshot, revision });
    if (calls.length === 1) throw new Error('Offline');
    return { snapshot, revision: revision + 1 };
  }, async () => initial, (...args) => notices.push(args));
  saver.update('edit'); await saver.flush();
  assert.equal(notices.at(-1)[0], 'retrying');
  t.mock.timers.tick(2000); await saver.flush();
  assert.equal(calls.length, 2); assert.equal(calls[1].revision, 1);
  assert.equal(notices.at(-1)[0], 'saved');
  await saver.dispose();
});

test('validation failures resume when the user corrects the document', async () => {
  let writes = 0; const notices = [];
  const saver = new NetworkAutosave(initial, async (snapshot, revision) => {
    if (++writes === 1) throw fail(400);
    return { snapshot, revision: revision + 1 };
  }, async () => initial, (...args) => notices.push(args), 60000);
  saver.update('invalid'); await saver.flush();
  assert.equal(notices.at(-1)[0], 'error');
  await saver.flush(); assert.equal(writes, 1);
  saver.update('corrected'); await saver.flush();
  assert.equal(notices.at(-1)[0], 'saved');
  await saver.dispose();
});

test('disposal cancels queued saves, waits for active writes, and ignores stale acknowledgements', async () => {
  const request = deferred(); let writes = 0; const notices = [];
  const saver = new NetworkAutosave(initial, async () => { writes++; return request.promise; },
    async () => initial, (...args) => notices.push(args), 60000);
  saver.update('first'); const pending = saver.flush(); saver.update('next');
  let disposed = false; const closing = saver.dispose().then(() => { disposed = true; });
  await Promise.resolve(); assert.equal(disposed, false);
  request.resolve({ snapshot: 'first', revision: 2 }); await pending; await closing;
  assert.equal(notices.filter(([, version]) => version).length, 0);
  await saver.flush(); assert.equal(writes, 1);
});

test('a correction queued before validation fails is saved without another user edit', async () => {
  const request = deferred(); let writes = 0;
  const saver = new NetworkAutosave(initial, async (snapshot, revision) => {
    if (++writes === 1) return request.promise;
    return { snapshot, revision: revision + 1 };
  }, async () => initial, () => {}, 60000);
  saver.update('invalid'); const pending = saver.flush();
  saver.update('corrected'); request.reject(fail(400)); await pending;
  await saver.flush(); assert.equal(writes, 2);
  await saver.dispose();
});

test('a known conflict stays paused even when the recovery read fails', async () => {
  let writes = 0; const notices = [];
  const saver = new NetworkAutosave(initial, async () => { writes++; throw fail(409); },
    async () => { throw new Error('Offline'); }, (...args) => notices.push(args), 60000);
  saver.update('edit'); await saver.flush();
  saver.update('new edit'); await saver.flush();
  assert.equal(writes, 1); assert.equal(notices.at(-1)[0], 'conflict');
  await saver.dispose();
});

test('loading, unchanged documents, and disposed pending drafts never write', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let writes = 0;
  const saver = new NetworkAutosave(initial, async () => { writes++; return initial; },
    async () => initial, () => {});
  saver.update('original'); t.mock.timers.tick(1000); await saver.flush();
  assert.equal(writes, 0);
  saver.update('edit'); await saver.dispose(); t.mock.timers.tick(1000);
  await saver.flush(); assert.equal(writes, 0);
});

test('lost acknowledgements recover even when database JSON keys are reordered', async () => {
  const notices = [];
  const saver = new NetworkAutosave(initial, async () => { throw new Error('Dropped response'); },
    async () => ({ revision: 2, snapshot: '{"devices":[{"id":"a","x":1}],"version":2}' }),
    (...args) => notices.push(args), 60000);
  const snapshot = '{"version":2,"devices":[{"x":1,"id":"a"}]}';
  saver.update(snapshot); await saver.flush();
  assert.equal(notices.at(-1)[0], 'saved');
  assert.deepEqual(notices.at(-1)[1], { revision: 2, snapshot });
  await saver.dispose();
});
