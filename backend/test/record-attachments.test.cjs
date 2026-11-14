require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RecordAttachmentsService } = require('../dist/modules/assets/record-attachments.service');
const { Asset } = require('../dist/modules/assets/models/asset.model');
const { System } = require('../dist/modules/assets/models/system.model');
test('asset and workstation files persist, append existing invoices, and set asset thumbnails', async () => {
  const oldAsset = Asset.findByPk, oldSystem = System.findByPk;
  const writes = [];
  const existing = { id: 'existing', purpose: 'invoice' };
  const record = { attachments: [existing], update: async (values, options) => { assert.ok(options.transaction); writes.push(values); } };
  Asset.findByPk = System.findByPk = async () => record;
  try {
    const tx = { LOCK: { UPDATE: 'UPDATE' } };
    const cdn = { upload: async (file, options) => ({ key: options.resourceType + '/file', url: 'https://cdn.example.com/file', mimeType: file.mimetype, size: file.size }) };
    const service = new RecordAttachmentsService({ transaction: async fn => fn(tx) }, cdn);
    const file = { originalname: 'invoice.pdf', mimetype: 'application/pdf', size: 10 };
    const invoice = await service.upload('systems', 'system', 'invoice', file);
    assert.equal(invoice.name, 'invoice.pdf'); assert.equal(invoice.purpose, 'invoice');
    assert.equal(writes[0].attachments[0], existing); assert.equal(writes[0].attachments[1], invoice);
    assert.equal(writes[0].imageUrl, undefined);
    const image = await service.upload('assets', 'asset', 'image', { ...file, mimetype: 'image/png' });
    assert.equal(writes[1].imageUrl, image.url); assert.equal(writes[1].imageKey, image.key);
    assert.deepEqual(await service.list('systems', 'system'), [existing]);
  } finally { Asset.findByPk = oldAsset; System.findByPk = oldSystem; }
});
test('rejects missing records and invalid resources before uploading', async () => {
  const old = Asset.findByPk; Asset.findByPk = async () => null;
  let uploaded = false;
  try {
    const service = new RecordAttachmentsService({}, { upload: async () => { uploaded = true; } });
    await assert.rejects(service.upload('assets', 'missing', 'invoice'), /Record not found/);
    await assert.rejects(service.upload('users', 'id', 'image'), /Invalid attachment resource/);
    await assert.rejects(service.upload('assets', 'id', 'other'), /Choose image or invoice/);
    assert.equal(uploaded, false);
  } finally { Asset.findByPk = old; }
});
test('database failure removes the newly uploaded object', async () => {
  const old = Asset.findByPk; Asset.findByPk = async () => ({ attachments: [] });
  const removed = [];
  try {
    const service = new RecordAttachmentsService({ transaction: async () => { throw new Error('Database failed'); } }, {
      upload: async () => ({ key: 'assets/new.pdf', url: 'https://cdn.example.com/new.pdf' }),
      deleteFile: async key => removed.push(key),
    });
    await assert.rejects(service.upload('assets', 'id', 'invoice'), /Database failed/);
    assert.deepEqual(removed, ['assets/new.pdf']);
  } finally { Asset.findByPk = old; }
});
