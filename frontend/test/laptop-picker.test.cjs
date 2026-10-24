const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
let poolQuery, unitQuery;
let categories = [{ id: 'laptops', name: 'Laptop' }, { id: 'desktops', name: 'Desktop PC' }];
let pool = { items: [{ id: 'asset', name: 'Finance laptop', quantityAvailable: 1 }], totalPages: 1 };
let units = [{ id: 'available', status: 'AVAILABLE', unitCode: 'LAP-001', serialNumber: 'SERIAL-1' }, { id: 'assigned', status: 'ASSIGNED', unitCode: 'BUSY-LAPTOP' }];
const api = {
  useGetAssetCategoriesQuery: () => ({ data: categories }),
  useGetAssetPoolQuery: (query, options) => { poolQuery = { query, options }; return { currentData: pool }; },
  useGetAssetUnitsByAssetQuery: (id, options) => { unitQuery = { id, options }; return { currentData: units }; },
};
const load = Module._load;
const previous = require.extensions['.tsx'];
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText, filename);
Module._load = function(request, parent, main) {
  if (parent?.filename.endsWith('LaptopAssetPicker.tsx')) {
    if (request.endsWith('asset.api')) return api;
    if (request === '../ui/input') return { Input: props => React.createElement('input', props) };
    if (request === '../ui/button') return { Button: ({ variant, ...props }) => React.createElement('button', props) };
  }
  return load.call(this, request, parent, main);
};
let LaptopAssetPicker;
try { ({ LaptopAssetPicker } = require('../src/components/systems/LaptopAssetPicker.tsx')); }
finally { Module._load = load; if (previous) require.extensions['.tsx'] = previous; else delete require.extensions['.tsx']; }
function render(props) { return renderToStaticMarkup(React.createElement(LaptopAssetPicker, { categoryId: 'laptops', value: null, onChange() {}, ...props })); }

test('laptop form prompts for stock while desktop form hides laptop assignment', () => {
  assert.match(render(), /Assign a laptop to this computer/);
  assert.equal(poolQuery.query.categoryId, 'laptops');
  assert.equal(poolQuery.query.kind, 'HARDWARE');
  assert.match(render(), /Assign later/);
  assert.equal(render({ categoryId: 'desktops' }), '');
  assert.equal(poolQuery.options.skip, true);
});
test('physical laptop choices exclude assigned units and show identifying serials', () => {
  const html = render({ value: { assetId: 'asset', assetUnitId: 'available' } });
  assert.equal(unitQuery.id, 'asset');
  assert.match(html, /LAP-001/);
  assert.match(html, /SERIAL-1/);
  assert.doesNotMatch(html, /BUSY-LAPTOP/);
});
test('editing a linked laptop shows current assignment without offering duplicate stock', () => {
  const html = render({ system: { assignments: [{ status: 'ACTIVE', asset: { name: 'Current laptop', categoryId: 'laptops' } }] } });
  assert.match(html, /Already linked: Current laptop/);
  assert.doesNotMatch(html, /Search available laptops/);
  assert.equal(poolQuery.options.skip, true);
});
