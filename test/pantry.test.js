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

test('måltid gråmarkerar kända varor och skapar röda slutposter för okända utan återköp', () => {
  const current = { items: [], pantry: [{ id: 'p', name: 'lax', category: 'fish', available: true }] };
  const actions = [{ type: 'pantry_use', id: 'p', name: 'lax' }, { type: 'pantry_use', name: 'potatis' }, { type: 'pantry_use', name: 'potatis' }];
  const result = applyHousehold(current, actions);
  assert.equal(result.pantry.length, 2); assert.equal(result.pantry[0].available, false);
  assert.equal(result.pantry[1].available, false); assert.equal(result.pantry[1].needsRestock, true);
  assert.equal(result.message.match(/potatis/g).length, 1);
  assert.deepEqual(result.items, []);
  assert.deepEqual(applyHousehold(result, actions).pantry, result.pantry);
  const restored = applyHousehold(result, [{ type: 'pantry_add', id: result.pantry[1].id, name: 'potatis' }]);
  assert.equal(restored.pantry[1].available, true); assert.equal(restored.pantry[1].needsRestock, undefined);
  assert.deepEqual(restored.items, []);
});

test('felmatchade id och tvetydiga varianter avvisas utan att ändra andra varor', () => {
  const current = { items: [], pantry: [{ id: 'mix', name: 'blandfärs', category: 'meat', available: true }] };
  assert.throws(() => applyHousehold(current, [{ type: 'pantry_use', id: 'mix', name: 'nötfärs' }]), /säkert matcha/);
  assert.throws(() => applyHousehold(current, [{ type: 'pantry_use', id: 'gone', name: 'nötfärs' }]), /säkert matcha/);
  assert.equal(current.pantry[0].available, true);
  const same = applyHousehold(current, [{ type: 'pantry_use', id: 'mix', name: 'blandfärs' }, { type: 'pantry_use', name: 'blandfärs' }]);
  assert.equal(same.message.match(/blandfärs/g).length, 1);
  const variants = { items: [], pantry: [{ id: 'a', name: 'broccoli', category: 'frozen', available: true }, { id: 'b', name: 'broccoli', category: 'vegetables', available: true }] };
  assert.throws(() => applyHousehold(variants, [{ type: 'pantry_use', name: 'broccoli' }]), /flera varianter/);
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
  let result = applyHousehold({ items: [item('shopping-rice', 'ris, 1 kg', 'pasta-rice')], pantry: [] }, [{ type: 'pantry_add', name: 'ris', category: 'pasta-rice' }, { type: 'pantry_add', name: 'Ris', category: 'pasta-rice' }]);
  assert.equal(result.pantry.length, 1);
  const id = result.pantry[0].id;
  result = applyHousehold(result, [{ type: 'pantry_category', id, name: 'ris', category: 'breakfast' }]);
  assert.equal(result.pantry[0].category, 'breakfast');
  result = applyHousehold(result, [{ type: 'pantry_remove', id: 'foreign', name: 'ris' }]);
  assert.equal(result.pantry.length, 1);
  assert.equal(result.items.length, 1);
  result = applyHousehold(result, [{ type: 'pantry_remove', id, name: 'ris' }]);
  assert.deepEqual(result.pantry, []);
  assert.deepEqual(result.items, []);
  assert.throws(() => applyHousehold(result, [{ type: 'pantry_add', name: 'salt', quantity: -1 }]), /mängder/);
});

test('bocken visas bara för gråa varor; köpknapp, minus och kategoripilar skickar rätt åtgärder', () => {
  const { document, window } = parseHTML('<html><body><div id="pantry"></div></body></html>');
  const container = document.getElementById('pantry'), actions = [];
  const queued = { shoppingItems: [item('s', 'pasta, 500 g', 'pasta-rice')] };
  renderPantry(container, [{ id: 'p', name: 'pasta', category: 'pasta-rice', available: false }], action => actions.push(action), false, queued);
  const row = container.querySelector('.pantry-item');
  assert.equal(row.classList.contains('is-empty'), true);
  assert.equal(row.querySelector('.pantry-name').textContent, 'Pasta');
  assert.equal(row.classList.contains('is-shopping'), true);
  assert.equal(row.querySelectorAll('.pantry-tools > *').length, 3);
  assert.equal(row.querySelectorAll('input').length, 0);
  row.querySelector('button').click();
  assert.equal(actions.pop().type, 'pantry_add');
  assert.equal(row.querySelector('[data-focus-key="p:pantry_low"]'), null);
  row.querySelector('[data-focus-key="p:pantry_remove"]').click(); assert.equal(actions.pop().type, 'pantry_remove');
  const select = row.querySelector('select'); select.querySelector('option[value=breakfast]').selected = true;
  select.dispatchEvent(new window.Event('change')); assert.equal(actions.pop().category, 'breakfast');
  renderPantry(container, [{ id: 'p', name: 'pasta', category: 'pasta-rice', available: true }], action => actions.push(action), false, queued);
  assert.equal(container.querySelector('.pantry-item').classList.contains('is-shopping'), false);
  assert.equal(container.querySelector('[data-focus-key="p:pantry_add"]'), null);
  assert.equal(container.querySelectorAll('.pantry-tools > *').length, 3);
  container.querySelector('[data-focus-key="p:pantry_low"]').click(); assert.equal(actions.pop().type, 'pantry_low');
  renderPantry(container, [{ id: 'p', name: 'pasta', category: 'pasta-rice', available: false }], () => {}, false, { shoppingItems: queued.shoppingItems.map(entry => ({ ...entry, checked: true })) });
  assert.equal(container.querySelector('.pantry-item').classList.contains('is-shopping'), false);
  renderPantry(container, [{ id: 'unknown', name: 'nötfärs', category: 'meat', available: false, needsRestock: true }], () => {});
  assert.equal(container.querySelector('.pantry-item').classList.contains('is-shopping'), true);
  assert.equal(container.querySelector('[data-focus-key="unknown:pantry_low"]'), null);
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
  const dir = await mkdtemp(path.join(os.tmpdir(), 'matglad-pantry-'));
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
  const available = await store.commit([{ type: 'pantry_add', name: 'avokado', category: 'vegetables' }], family.id);
  const avocado = available.pantry.find(entry => entry.name === 'avokado');
  const buy = await store.commit([{ type: 'pantry_low', id: avocado.id, name: avocado.name }], family.id);
  assert.equal(buy.pantry.find(entry => entry.id === avocado.id).available, false);
  assert.equal(buy.items.some(entry => entry.name === 'avokado' && !entry.checked), true);
  const restored = await store.commit([{ type: 'pantry_add', id: avocado.id, name: avocado.name }], family.id);
  assert.equal(restored.pantry.find(entry => entry.id === avocado.id).available, true);
  assert.deepEqual(restored.items, buy.items);
  const removed = await store.commit([{ type: 'pantry_remove', id: avocado.id, name: avocado.name }], family.id);
  assert.equal(removed.items.some(entry => entry.name === 'avokado'), false);
  assert.equal(removed.pantry.some(entry => entry.id === avocado.id), false);
  const recovered = await store.commit([{ type: 'undo' }], family.id, { undoId: removed.undoId });
  assert.deepEqual(recovered.items, restored.items); assert.deepEqual(recovered.pantry, restored.pantry);
  const missing = await store.commit([{ type: 'pantry_use', name: 'torsk', category: 'fish' }], family.id);
  store = await createStore();
  assert.equal((await store.readState(family.id)).pantry.find(entry => entry.name === 'torsk').needsRestock, true);
  assert.deepEqual(missing.items, recovered.items);
  const undoMissing = await store.commit([{ type: 'undo' }], family.id, { undoId: missing.undoId });
  assert.deepEqual(undoMissing.pantry, recovered.pantry);
});
