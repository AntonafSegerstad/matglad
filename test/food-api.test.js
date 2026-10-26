import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('HTTP: röst och text kan svara om mat utan att spara ändringar, och tydliga köp bockas av', { timeout: 20000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'homehelper-food-test-'));
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const original = [{ id: 'mince', name: 'köttfärs', checked: false, category: 'meat', quantity: 2 }];
  const listFile = path.join(dir, 'list.json');
  await writeFile(listFile, JSON.stringify(original));
  // Intercept only OpenAI in this isolated child process. No real key or network
  // request is used, and the HTTP handler still performs transcription + reply.
  const mockFile = path.join(dir, 'mock-openai.mjs');
  await writeFile(mockFile, `
    import assert from 'node:assert/strict';
    const actualFetch = globalThis.fetch;
    globalThis.fetch = async (url, options) => {
      if (!String(url).startsWith('https://api.openai.com/')) return actualFetch(url, options);
      if (String(url).endsWith('/audio/transcriptions')) {
        assert.equal(options.body.get('model'), 'gpt-4o-mini-transcribe');
        assert.equal(options.body.get('language'), 'sv');
        return Response.json({ text: 'Vi lagade köttfärssås idag' });
      }
      const body = JSON.parse(options.body);
      assert.equal(body.response_format.json_schema.name, 'list_chat');
      assert.match(body.messages[0].content, /familjens matkunniga köksassistent/);
      const { command } = JSON.parse(body.messages[1].content);
      const buying = command === 'Jag har köpt köttfärsen';
      const answer = buying
        ? { reply: '', actions: [{ type: 'check', id: 'mince', name: 'köttfärs', quantity: null, category: null }] }
        : { reply: 'Köttfärssås innehåller ofta köttfärs, lök och tomat. Skafferi är inte tillgängligt ännu, så inget lageravdrag görs.', actions: [] };
      return Response.json({ choices: [{ message: { content: JSON.stringify(answer) } }] });
    };
  `);
  const env = { ...process.env, PORT: '0', DATA_DIR: dir, OPENAI_API_KEY: 'fake-test-key', OPENAI_TRANSCRIBE_MODEL: 'gpt-4o-mini-transcribe' };
  delete env.DATABASE_URL; delete env.RENDER;
  const child = spawn(process.execPath, ['--import', mockFile, 'server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(async () => {
    if (child.exitCode === null) { const done = once(child, 'exit'); child.kill(); await done; }
    await rm(dir, { recursive: true, force: true });
  });
  const port = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Servern startade inte.')), 10000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error('Servern avslutades: ' + code)); });
    child.stdout.on('data', chunk => { output += chunk; const match = output.match(/port (\d+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
  });
  const base = 'http://127.0.0.1:' + port;
  const saved = await readFile(listFile, 'utf8');
  async function send(route, payload, raw = false) {
    const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': raw ? 'audio/wav' : 'application/json' }, body: raw ? payload : JSON.stringify(payload) });
    assert.equal(response.status, 200);
    return response.json();
  }
  const text = await send('/api/chat', { text: 'Vi lagade köttfärssås idag' });
  assert.match(text.reply, /inget lageravdrag/);
  assert.deepEqual(text.items, original);
  const voice = await send('/api/voice', new Uint8Array([1, 2, 3]), true);
  assert.equal(voice.transcript, 'Vi lagade köttfärssås idag');
  assert.equal(voice.message, voice.reply);
  assert.match(voice.reply, /Skafferi/);
  assert.equal(await readFile(listFile, 'utf8'), saved, 'Matfrågor får inte skriva om listfilen.');
  const bought = await send('/api/command', { text: 'Jag har köpt köttfärsen' });
  assert.equal(bought.items[0].checked, true);
  assert.equal(bought.items[0].quantity, 2);
  assert.equal(bought.items.length, 1);
  assert.equal(bought.reply, 'Bockade av köttfärs.');
  assert.equal(bought.message, bought.reply);
});
