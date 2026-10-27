import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseHTML } from 'linkedom';
import { applyHousehold, chatWithList } from '../list.js';
import { createStore } from '../storage.js';
import { renderPantry } from '../public/pantry-view.js';

const item = (id, name, category, checked = false) => ({ id, name, category, checked, quantity: 1 });
test('utcheckning fyller på kända varutyper utan mängder och återaktiverar gråa poster', () => {
  const current = { items: [item('a', 'lax, 750 g', 'fish', true), item('b', 'ris', 'pasta-rice')], pantry: [{ id: 'p', name: 'lax', category: 'fish', available: false }] };
  const result = applyHousehold(current, [{ type: 'checkout' }]);
  assert.equal(result.items.length, 1); assert.equal(result.items[0].name, 'ris');
  assert.deepEqual(result.pantry, [{ id: 'p', name: 'lax', category: 'fish', available: true }]);
  assert.equal(result.checkedOut, 1);
  assert.deepEqual(applyHousehold(result, [{ type: 'checkout' }]).pantry, result.pantry);
  assert.equal(current.pantry[0].available, false);
});

test('måltid gråmarkerar bara inventerade varor och skapar inga minus eller nya inköp', () => {
  const current = { items: [], pantry: [{ id: 'p', name: 'lax', category: 'fish', available: true }] };
  const actions = [{ type: 'pantry_use', id: 'p', name: 'lax' }, { type: 'pantry_use', name: 'potatis' }];
  const result = applyHousehold(current, actions);
  assert.equal(result.pantry.length, 1); assert.equal(result.pantry[0].available, false);
  assert.deepEqual(result.items, []);
  assert.deepEqual(applyHousehold(result, actions).pantry, result.pantry);
});

test('lite kvar aktiverar en befintlig inköpsrad utan dubblett och behåller varianter', () => {
  const current = { items: [item('a', 'pasta, 500 g', 'pasta-rice', true)], pantry: [{ id: 'p', name: 'pasta', category: 'pasta-rice', available: true }] };
  const result = applyHousehold(current, [{ type: 'pantry_low', id: 'p', name: 'pasta' }]);
  assert.equal(result.pantry[0].available, false); assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, 'a'); assert.equal(result.items[0].checked, false);
  const both = applyHousehold({ items: [item('a', 'broccoli', 'frozen', true), item('b', 'broccoli', 'vegetables', true)], pantry: [] }, [{ type: 'pantry_buy', name: 'broccoli', category: 'vegetables' }]);
  assert.equal(both.items[0].checked, true); assert.equal(both.items[1].checked, false);
});

test('inventering är idempotent; borttagning och kategoribyte kräver rätt skafferi-id', () => {
  let result = applyHousehold({ items: [], pantry: [] }, [{ type: 'pantry_add', name: 'ris', category: 'pasta-rice' }, { type: 'pantry_add', name: 'Ris', category: 'pasta-rice' }]);
  assert.equal(result.pantry.length, 1);
  const id = result.pantry[0].id;
  result = applyHousehold(result, [{ type: 'pantry_category', id, name: 'ris', category: 'breakfast' }]);
  assert.equal(result.pantry[0].category, 'breakfast');
  result = applyHousehold(result, [{ type: 'pantry_remove', id: 'foreign', name: 'ris' }]);
  assert.equal(result.pantry.length, 1);
  result = applyHousehold(result, [{ type: 'pantry_remove', id, name: 'ris' }]);
  assert.deepEqual(result.pantry, []);
  assert.throws(() => applyHousehold(result, [{ type: 'pantry_add', name: 'salt', quantity: -1 }]), /mängder/);
});

test('skafferirader visar namn och exakt tre symboler, och skickar rätt åtgärder', () => {
  const { document, window } = parseHTML('<html><body><div id="pantry"></div></body></html>');
  const container = document.getElementById('pantry'), actions = [];
  renderPantry(container, [{ id: 'p', name: 'pasta', category: 'pasta-rice', available: false }], action => actions.push(action));
  const row = container.querySelector('.pantry-item');
  assert.equal(row.classList.contains('is-empty'), true);
  assert.equal(row.querySelector('.pantry-name').textContent, 'Pasta');
  assert.equal(row.querySelectorAll('.pantry-tools > *').length, 3);
  assert.equal(row.querySelectorAll('input').length, 0);
  row.querySelector('button').click();
  assert.equal(actions.pop().type, 'pantry_buy');
  row.querySelectorAll('button')[1].click(); assert.equal(actions.pop().type, 'pantry_remove');
  const select = row.querySelector('select'); select.querySelector('option[value=breakfast]').selected = true;
  select.dispatchEvent(new window.Event('change')); assert.equal(actions.pop().category, 'breakfast');
});

test('AI receives pantry context and can return an atomic low-stock change', async () => {
  const pantry = [{ id: 'p', name: 'pasta', category: 'pasta-rice', available: true }];
  const result = await chatWithList('Bara lite pasta kvar', [], 'fake', [], async (_, options) => {
    const body = JSON.parse(options.body);
    assert.deepEqual(JSON.parse(body.messages[1].content).pantry, pantry);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ reply: '', actions: [{ type: 'pantry_low', id: 'p', name: 'pasta', quantity: null, category: null }] }) } }] });
  }, pantry);
  const changed = applyHousehold({ items: [], pantry }, result.actions);
  assert.equal(changed.pantry[0].available, false); assert.equal(changed.items[0].checked, false);
});

test('spara, ångra, återförsök, samtidighet och familjbyte håller skafferi och inköp ihop', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'homehelper-pantry-'));
  const previous = { DATA_DIR: process.env.DATA_DIR, DATABASE_URL: process.env.DATABASE_URL, RENDER: process.env.RENDER };
  process.env.DATA_DIR = dir; delete process.env.DATABASE_URL; delete process.env.RENDER;
  t.after(async () => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } await rm(dir, { recursive: true, force: true }); });
  let store = await createStore();
  const family = await store.addFamily('Test');
  await store.commit([{ type: 'add', name: 'lax, 750 g', category: 'fish' }], family.id);
  await store.commit([{ type: 'check', name: 'lax, 750 g' }], family.id);
  const result = await store.commit([{ type: 'checkout' }], family.id, { requestId: 'checkout-1' });
  assert.equal(result.items.length, 0); assert.equal(result.pantry[0].available, true);
  const again = await store.commit([{ type: 'checkout' }], family.id, { requestId: 'checkout-1' });
  assert.equal(again.pantry.length, 1); assert.equal(again.undoId, result.undoId);
  store = await createStore();
  const undo = await store.commit([{ type: 'undo' }], family.id, { undoId: result.undoId, requestId: 'undo-1' });
  assert.equal(undo.items[0].checked, true); assert.deepEqual(undo.pantry, []);
  await store.commit([{ type: 'undo' }], family.id, { undoId: result.undoId, requestId: 'undo-1' });
  assert.equal((await store.readState(family.id)).items[0].checked, true);
  assert.deepEqual((await store.readState()).pantry, []); assert.deepEqual(await store.read(), []);
  const state = await store.readState(family.id);
  await Promise.all([store.commit([{ type: 'pantry_add', name: 'ris' }], family.id), store.commit([{ type: 'pantry_add', name: 'salt' }], family.id)]);
  await assert.rejects(store.commit([{ type: 'pantry_use', name: 'ris' }], family.id, { expectedVersion: state.version }), /ändrades/);
  const before = await store.readState(family.id);
  await assert.rejects(store.commit([{ type: 'pantry_remove', name: 'ris' }, { type: 'add', name: 'test', quantity: -1 }], family.id));
  assert.deepEqual(await store.readState(family.id), before);
  await assert.rejects(store.commit([{ type: 'undo' }], family.id, { undoId: result.undoId }), /ny ändring/);
});
