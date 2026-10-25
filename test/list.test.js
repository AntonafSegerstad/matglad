import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyActions, interpret } from '../list.js';

test('lägg till, undvik dubbletter, bocka av och återställ', () => {
  const added = applyActions([], [{ type: 'add', name: 'Mjölk' }, { type: 'add', name: 'ägg' }]);
  assert.equal(added.items.length, 2);
  assert.equal(applyActions(added.items, [{ type: 'add', name: ' mjölk ' }]).items.length, 2);
  const checked = applyActions(added.items, [{ type: 'check', name: 'mjölk' }]);
  assert.equal(checked.items[0].checked, true);
  assert.equal(added.items[0].checked, false);
  assert.equal(applyActions(checked.items, [{ type: 'uncheck', name: 'Mjölk' }]).items[0].checked, false);
  assert.equal(applyActions(checked.items, [{ type: 'add', name: 'mjölk' }]).items[0].checked, false);
});
test('okänd avbockning skapar inte en ny vara', () => {
  const result = applyActions([], [{ type: 'check', name: 'lax' }]);
  assert.equal(result.items.length, 0);
  assert.match(result.message, /Hittade inte/);
});
test('ogiltiga AI-åtgärder avvisas utan att ändra listan', () => {
  const items = [{ id: '1', name: 'salt', checked: false }];
  assert.throws(() => applyActions(items, [{ type: 'check', name: 'salt' }, { type: 'delete_all', name: 'allt' }]));
  assert.equal(items[0].checked, false);
  assert.throws(() => applyActions(items, undefined));
});
test('AI skickar listkontext och begär ett strikt strukturerat svar', async () => {
  const actions = [{ type: 'add', name: 'ägg' }, { type: 'check', name: 'mjölk' }];
  const result = await interpret('Lägg till ägg och bocka av mjölken', [{ name: 'mjölk', checked: false }], 'test-key', async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    const body = JSON.parse(options.body);
    assert.equal(body.response_format.json_schema.strict, true);
    assert.match(body.messages[1].content, /mjölk/);
    return { ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify({ actions }) } }] }) };
  });
  assert.deepEqual(result, actions);
});
test('OpenAI-fel ger begripligt fel utan att exponera leverantörssvaret', async () => {
  await assert.rejects(interpret('ägg', [], 'test-key', async () => ({ ok: false })), /Kontrollera API-nyckel/);
});

test('äldre varor får antal ett utan att ordning, id eller bockar ändras', () => {
  const items = [{ id: 'a', name: 'mjölk', checked: true }, { id: 'b', name: 'ägg', checked: false }];
  const result = applyActions(items, []);
  assert.deepEqual(result.items.map(i => [i.id, i.checked, i.quantity, i.category]), [['a', true, 1, null], ['b', false, 1, null]]);
  assert.equal(items[0].quantity, undefined);
});
test('antal och kategori kan ändras utan att varan flyttas i listan', () => {
  const items = applyActions([], [{ type: 'add', name: 'gurka', quantity: 2, category: 'vegetables' }, { type: 'add', name: 'mjölk', category: 'dairy' }]).items;
  const id = items[0].id;
  const result = applyActions(items, [{ type: 'update', id, name: 'gurka', quantity: 3 }, { type: 'update', id, name: 'gurka', category: 'frozen' }, { type: 'check', id, name: 'gurka' }]);
  assert.equal(result.items[0].id, id);
  assert.equal(result.items[0].quantity, 3);
  assert.equal(result.items[0].category, 'frozen');
  assert.equal(result.items[0].checked, true);
});
test('ogiltiga antal och kategorier avvisas atomiskt', () => {
  const items = [{ id: 'a', name: 'mjölk', checked: false }];
  for (const quantity of [0, -1, 1.5, 1000, '2']) {
    assert.throws(() => applyActions(items, [{ type: 'remove', id: 'a', name: 'mjölk' }, { type: 'add', name: 'ägg', quantity }]), /Antalet/);
  }
  assert.throws(() => applyActions(items, [{ type: 'update', name: 'mjölk', category: 'not-a-category' }]), /kategori/);
  assert.deepEqual(items, [{ id: 'a', name: 'mjölk', checked: false }]);
});
test('borttagning använder artikelns id och lämnar andra varor orörda', () => {
  const items = [{ id: 'a', name: 'broccoli', category: 'vegetables', checked: false }, { id: 'b', name: 'broccoli', category: 'frozen', checked: true }];
  const result = applyActions(items, [{ type: 'remove', id: 'b', name: 'broccoli' }]);
  assert.deepEqual(result.items.map(i => i.id), ['a']);
  assert.equal(result.items[0].checked, false);
});
test('AI får inte skriva över en manuellt vald kategori eller skapa om en borttagen vara', () => {
  const items = [{ id: 'a', name: 'mjölk', category: 'dairy', quantity: 4, checked: false }];
  let result = applyActions(items, [{ type: 'categorize', id: 'a', name: 'mjölk', category: 'drinks' }]);
  assert.equal(result.items[0].category, 'dairy');
  result = applyActions(result.items, [{ type: 'add', name: 'mjölk', category: 'drinks' }]);
  assert.equal(result.items[0].category, 'dairy');
  assert.equal(result.items[0].quantity, 4);
  result = applyActions(result.items, [{ type: 'remove', id: 'a', name: 'mjölk' }, { type: 'categorize', id: 'a', name: 'mjölk', category: 'drinks' }]);
  assert.equal(result.items.length, 0);
});
