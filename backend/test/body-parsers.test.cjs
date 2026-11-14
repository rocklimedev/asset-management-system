const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { registerBodyParsers } = require('../dist/common/body-parsers');

test('login receives JSON credentials and network retains its larger body limit', async () => {
  const app = express();
  registerBodyParsers(app);
  app.post('/api/auth/login', (req, res) => res.json(req.body));
  app.put('/api/network', (req, res) => res.json({ length: req.body.notes.length }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const credentials = { email: 'test@example.com', password: 'test-password' };
    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    assert.equal(login.status, 200);
    assert.deepEqual(await login.json(), credentials);
    const network = await fetch(`${base}/api/network`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'x'.repeat(200_000) }),
    });
    assert.equal(network.status, 200);
    assert.deepEqual(await network.json(), { length: 200_000 });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
