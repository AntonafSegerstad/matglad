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
