require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { CdnService } = require('../dist/modules/cdn/cdn.service');
function service(settings) { return new CdnService({ get: key => settings[key] }); }
function file(mime = 'application/pdf', data = Buffer.from('%PDF-1.7 test')) { return { buffer: data, size: data.length, mimetype: mime }; }
test('local invoices and legacy images round trip and deletion is idempotent', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'itam-cdn-'));
  try {
    const cdn = service({ CDN_STORAGE_ROOT: root, CDN_PUBLIC_BASE_URL: 'https://cdn.example.com/' });
    const input = file();
    const result = await cdn.upload(input, { resourceType: 'software', resourceId: 'record-1', purpose: 'invoice' });
    assert.match(result.key, /^software\/record-1\/invoices\/[a-f0-9-]+\.pdf$/);
    assert.equal(result.url, 'https://cdn.example.com/' + result.key);
    assert.deepEqual(await fs.readFile(path.join(root, result.key)), input.buffer);
    const image = await cdn.uploadAssetImage(file('image/jpeg', Buffer.from([255, 216, 255, 0])));
    assert.match(image.key, /^assets\/images\//);
    await cdn.deleteFile(result.key);
    await cdn.deleteFile(result.key);
    await assert.rejects(fs.readFile(path.join(root, result.key)), { code: 'ENOENT' });
    await cdn.deleteAssetImage(image.key);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
test('rejects spoofed files, oversized uploads, missing files and unsafe keys', async () => {
  const cdn = service({ CDN_PUBLIC_BASE_URL: 'https://cdn.example.com' });
  const options = { resourceType: 'assets', purpose: 'image' };
  await assert.rejects(cdn.upload(undefined, options), /No file/);
  await assert.rejects(cdn.upload(file('image/jpeg'), options), /valid JPEG/);
  await assert.rejects(cdn.upload(file('application/pdf'), options), /valid JPEG/);
  const huge = Buffer.alloc(5 * 1024 * 1024 + 1); huge.set([255, 216, 255]);
  await assert.rejects(cdn.upload(file('image/jpeg', huge), options), /size limit/);
  await assert.rejects(cdn.upload(file(), { ...options, purpose: 'invoice', resourceType: '../assets' }), /Invalid CDN resource/);
  for (const key of ['../outside.pdf', 'assets/../../outside.pdf', 'C:\\file', '/root/file', 'assets/%2e%2e/file', 'assets//file']) {
    await assert.rejects(cdn.deleteFile(key), /Invalid CDN file key/);
  }
});
test('HTTP storage uses configured credentials, raw bytes and idempotent deletes', async () => {
  const oldFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, options) => { calls.push({ url, options }); return { ok: options.method !== 'DELETE', status: options.method === 'DELETE' ? 404 : 201 }; };
  try {
    const cdn = service({ CDN_STORAGE_DRIVER: 'http', CDN_API_URL: 'https://storage.example.com/objects/', CDN_API_TOKEN: 'test-token', CDN_PUBLIC_BASE_URL: 'https://cdn.example.com' });
    const result = await cdn.upload(file(), { resourceType: 'assets', purpose: 'invoice' });
    assert.equal(calls[0].url, 'https://storage.example.com/objects/' + result.key);
    assert.equal(calls[0].options.headers.Authorization, 'Bearer test-token');
    assert.equal(calls[0].options.method, 'PUT');
    assert.deepEqual(Buffer.from(calls[0].options.body), file().buffer);
    await cdn.deleteFile(result.key);
    assert.equal(calls[1].options.method, 'DELETE');
    global.fetch = async () => ({ ok: false, status: 500 });
    await assert.rejects(cdn.deleteFile(result.key), /storage request failed/);
  } finally { global.fetch = oldFetch; }
});
test('missing credentials and delivery URL fail before storing files', async () => {
  const cdn = service({ CDN_STORAGE_DRIVER: 'http', CDN_PUBLIC_BASE_URL: 'https://cdn.example.com' });
  await assert.rejects(cdn.upload(file(), { resourceType: 'software', purpose: 'invoice' }), /must be configured/);
  await assert.rejects(service({}).upload(file(), { resourceType: 'software', purpose: 'invoice' }), /PUBLIC_BASE_URL/);
});
