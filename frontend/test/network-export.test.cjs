const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { networkImagePdf } = require('../src/components/network/network-export.ts');
const { rackDeviceConnectionIds } = require('../src/components/network/topology.ts');
const seed = require('../../backend/seeds/network-map.json');

test('local line visibility hides dedicated rack wiring while preserving cross-rack and shared links', () => {
  const d = structuredClone(seed), base = d.devices[0];
  d.racks = [{ ...d.racks[0], id: 'a' }, { ...d.racks[0], id: 'b' }];
  d.devices = [['switch', 'a'], ['camera', null], ['leaf', null], ['other', 'b'], ['shared', null]]
    .map(([id, rackId]) => ({ ...base, id, rackId }));
  d.connections = [['switch', 'camera'], ['camera', 'leaf'], ['switch', 'other'], ['switch', 'shared'], ['shared', 'other']]
    .map(([a,b], i) => ({ ...d.connections[0], id: String(i), source: { deviceId: a, portId: null }, target: { deviceId: b, portId: null } }));
  const original = structuredClone(d);
  assert.deepEqual([...rackDeviceConnectionIds(d)], ['0', '1']);
  assert.deepEqual(d, original);
});

test('image PDF uses valid binary byte offsets and preserves JPEG bytes', () => {
  const jpeg = Uint8Array.from([255,216,255,0,128,10,255,217]);
  const bytes = Buffer.from(networkImagePdf(jpeg, 1200, 800));
  const text = bytes.toString('latin1');
  assert.ok(text.startsWith('%PDF-1.4'));
  const xref = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.equal(bytes.subarray(xref,xref+4).toString(), 'xref');
  const entries = text.slice(xref).split('\n').slice(3,8);
  entries.forEach((entry,i) => {
    const offset=Number(entry.slice(0,10));
    assert.ok(bytes.subarray(offset).toString('latin1').startsWith(`${i+1} 0 obj\n`));
  });
  const imageStart = text.indexOf('stream\n',text.indexOf('4 0 obj')) + 7;
  assert.deepEqual(bytes.subarray(imageStart,imageStart+jpeg.length),Buffer.from(jpeg));
  assert.ok(text.includes('/MediaBox [0 0 1190.55 841.89]'));
  assert.ok(text.includes(`/Length ${jpeg.length}`));
  const portrait = Buffer.from(networkImagePdf(jpeg,800,1200)).toString();
  assert.ok(portrait.includes('/MediaBox [0 0 841.89 1190.55]'));
  assert.throws(() => networkImagePdf(jpeg,0,100));
});
