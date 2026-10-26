import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
test('HTTP: äldre lista, antal, kategoribyte, omstart och borttagning', { timeout: 30000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'homehelper-test-'));
  await writeFile(path.join(dir, 'list.json'), JSON.stringify([{ id: 'legacy', name: 'mjölk', checked: true }]));
  let child, base;
  const env = { ...process.env, PORT: '0', DATA_DIR: dir, OPENAI_API_KEY: '' };
  delete env.DATABASE_URL; delete env.RENDER;
  async function start() {
    child = spawn(process.execPath, ['server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const port = await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(new Error('Servern startade inte.')), 10000);
      child.once('error', reject);
      child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Servern avslutades: ${code}`)); });
      child.stdout.on('data', chunk => { output += chunk; const match = output.match(/port (\d+)/); if (match) { clearTimeout(timeout); resolve(match[1]); } });
    });
    base = `http://127.0.0.1:${port}`;
  }
  async function stop() { if (!child || child.exitCode !== null) return; const done = once(child, 'exit'); child.kill(); await done; }
  t.after(async () => { await stop(); await rm(dir, { recursive: true, force: true }); });
  async function get(route) { const r = await fetch(base + route); assert.equal(r.status, 200); return r.json(); }
  async function act(actions) {
    const r = await fetch(base + '/api/actions', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ actions }) });
    assert.equal(r.status, 200); return r.json();
  }
  await start();
  let current = await get('/api/list');
  assert.equal(current.items[0].quantity, 1); assert.equal(current.items[0].checked, true);
  await act([{ type: 'update', id: 'legacy', name: 'mjölk', quantity: 3, category: 'dairy' }]);
  await act([{ type: 'add', name: 'potatis', quantity: 2, category: 'vegetables' }]);
  await act([{ type: 'uncheck', id: 'legacy', name: 'mjölk' }]);
  await stop(); await start();
  current = await get('/api/list');
  assert.deepEqual(current.items.map(i => [i.name, i.quantity, i.category, i.checked]), [['mjölk', 3, 'dairy', false], ['potatis', 2, 'vegetables', false]]);
  const bad = await fetch(base + '/api/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actions: [{ type: 'remove', id: 'legacy', name: 'mjölk' }, { type: 'add', name: 'salt', quantity: 0 }] }) });
  assert.equal(bad.status, 400); assert.equal((await get('/api/list')).items.length, 2);
  await act([{ type: 'remove', id: 'legacy', name: 'mjölk' }]);
  current = await get('/api/list'); assert.equal(current.items.length, 1); assert.equal(current.items[0].name, 'potatis');
  for (const route of ['/', '/list-view.js', '/categories.js', '/chat.js', '/style.css']) assert.equal((await fetch(base + route)).status, 200);
  assert.equal((await fetch(base + '/.env')).status, 404);
  const chat = await fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ text: 'Vad finns på listan?', history: [] }) });
  assert.equal(chat.status, 503);
  assert.match((await chat.json()).error, /AI-chatten/);
  assert.equal((await get('/api/list')).items.length, 1);
});
