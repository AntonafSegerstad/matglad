import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { once } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

test('HTTP: behöver köpas markeras grått och återaktiveras i Att handla via röst och text', { timeout: 20000 }, async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'matglad-food-test-'));
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
        return Response.json({ text: 'Köttfärsen behöver köpas' });
      }
      const body = JSON.parse(options.body);
      if (body.response_format.json_schema.name === 'meal_review') return Response.json({ choices: [{ message: { content: JSON.stringify({ intent: 'stock_update', clarification: '', ingredients: [] }) } }] });
      assert.equal(body.response_format.json_schema.name, 'list_chat');
      assert.match(body.messages[0].content, /familjens matkunniga köksassistent/);
      const { command } = JSON.parse(body.messages[1].content);
      if (command === 'Inventera köttfärs') return Response.json({ choices: [{ message: { content: JSON.stringify({ reply: 'Jag har lagt till allt som finns på inköpslistan.', actions: [{ type: 'pantry_add', id: 'mince', name: 'köttfärs', quantity: null, category: 'meat' }] }) } }] });
      const buying = command === 'Jag har köpt köttfärsen';
      const answer = buying
        ? { reply: '', actions: [{ type: 'check', id: 'mince', name: 'köttfärs', quantity: null, category: null }] }
        : { reply: 'En egen, osäker ändringsbeskrivning som inte ska visas.', actions: [{ type: 'pantry_low', id: null, name: 'köttfärs', quantity: null, category: 'meat' }, { type: 'pantry_low', id: null, name: 'köttfärs', quantity: null, category: 'meat' }] };
      return Response.json({ choices: [{ message: { content: JSON.stringify(answer) } }] });
    };
  `);
  const env = { ...process.env, PORT: '0', DATA_DIR: dir, OPENAI_API_KEY: 'fake-test-key', OPENAI_TRANSCRIBE_MODEL: 'gpt-4o-mini-transcribe' };
  delete env.DATABASE_URL; delete env.RENDER;
  const child = spawn(process.execPath, ['--import', pathToFileURL(mockFile).href, 'server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
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
  const text = await send('/api/chat', { text: 'Köttfärsen behöver köpas' });
  assert.match(text.reply, /har lagts i Att handla/); assert.equal(text.pantry.length, 1); assert.equal(text.pantry[0].available, false);
  assert.equal(text.reply.match(/köttfärs/gi).length, 1); assert.equal(text.reply.includes('osäker ändringsbeskrivning'), false);
  assert.deepEqual(text.items, original);
  const voice = await send('/api/voice', new Uint8Array([1, 2, 3]), true);
  assert.equal(voice.transcript, 'Köttfärsen behöver köpas');
  assert.equal(voice.message, voice.reply);
  assert.match(voice.reply, /har lagts i Att handla/); assert.deepEqual(voice.pantry, text.pantry);
  assert.equal(await readFile(listFile, 'utf8'), saved, 'Den gamla listfilen lämnas kvar oförändrad.');
  const bought = await send('/api/command', { text: 'Jag har köpt köttfärsen' });
  assert.equal(bought.items[0].checked, true);
  assert.equal(bought.items[0].quantity, 2);
  assert.equal(bought.items.length, 1);
  assert.equal(bought.reply, 'Bockade av köttfärs.');
  assert.equal(bought.message, bought.reply);
  const corrected = await send('/api/chat', { text: 'Inventera köttfärs' });
  assert.equal(corrected.pantry.length, 1); assert.equal(corrected.pantry[0].available, true);
  assert.notEqual(corrected.pantry[0].id, 'mince');
  assert.equal(corrected.reply, corrected.message);
  assert.equal(corrected.reply.includes('allt som finns på inköpslistan'), false);
  // Inventory, consumption and undo operate on the same saved household state.
  const inventory = await send('/api/pantry', { actions: [{ type: 'pantry_add', name: 'köttfärs', category: 'meat' }] });
  assert.equal(inventory.pantry[0].available, true);
  const meal = await send('/api/chat', { text: 'Köttfärsen behöver köpas' });
  assert.equal(meal.pantry[0].available, false); assert.equal(meal.items[0].checked, false);
  const undone = await send('/api/undo', { undoId: meal.undoId, requestId: 'undo-meal' });
  assert.equal(undone.pantry[0].available, true);
  const repeatUndo = await send('/api/undo', { undoId: meal.undoId, requestId: 'undo-meal' });
  assert.deepEqual(repeatUndo.pantry, undone.pantry);
  const low = await send('/api/pantry', { actions: [{ type: 'pantry_low', id: undone.pantry[0].id, name: 'köttfärs' }] });
  assert.equal(low.pantry[0].available, false); assert.equal(low.items.length, 1); assert.equal(low.items[0].checked, false);
  assert.equal(low.items[0].quantity, 2);
  const category = await send('/api/pantry', { actions: [{ type: 'pantry_category', id: low.pantry[0].id, name: 'köttfärs', category: 'poultry' }] });
  assert.equal(category.pantry[0].category, 'poultry');
  const removed = await send('/api/pantry', { actions: [{ type: 'pantry_remove', id: low.pantry[0].id, name: 'köttfärs' }] });
  assert.deepEqual(removed.pantry, []); assert.equal(removed.items.length, 0);
  assert.equal((await fetch(base + '/pantry-view.js')).status, 200);
  const state = await (await fetch(base + '/api/list')).json();
  assert.equal('history' in state, false); assert.equal('requests' in state, false);
});

