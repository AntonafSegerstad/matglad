import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyProducts, categorizeNewActions, interpret, chatWithList } from '../list.js';
import { matgladInstructions } from '../ai-instructions.js';
const reply = data => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(data) } }] }) });

test('kategorisering kopplas till rätt vara även om AI-svaret är omordnat', async () => {
  const result = await classifyProducts(['mjölk', 'fryst broccoli'], 'test-key', async (_, options) => {
    const body = JSON.parse(options.body);
    const input = JSON.parse(body.messages[1].content);
    assert.equal(input.categories.length, 30);
    assert.deepEqual(input.products.map(p => p.name), ['mjölk', 'fryst broccoli']);
    return reply({ products: [{ index: 1, category: 'frozen' }, { index: 0, category: 'dairy' }] });
  });
  assert.deepEqual(result, ['dairy', 'frozen']);
});
test('ogiltig, saknad eller dubblerad AI-kategorisering avvisas', async () => {
  for (const products of [[], [{ index: 0, category: 'unknown' }], [{ index: 1, category: 'dairy' }], [{ index: 0, category: undefined }]]) {
    await assert.rejects(classifyProducts(['mjölk'], 'test-key', async () => reply({ products })), /kategorisera/);
  }
  await assert.rejects(classifyProducts(['mjölk', 'ägg'], 'test-key', async () => reply({ products: [{ index: 0, category: 'dairy' }, { index: 0, category: 'dairy' }] })), /kategorisera/);
});
test('manuellt tillagda nya varor kategoriseras i ett anrop och befintliga val bevaras', async () => {
  const items = [{ id: 'a', name: 'mjölk', category: 'dairy', quantity: 2 }];
  const actions = [{ type: 'add', name: 'mjölk' }, { type: 'add', name: 'morötter' }, { type: 'add', name: 'morötter' }, { type: 'check', name: 'mjölk' }];
  let calls = 0;
  const result = await categorizeNewActions(actions, items, async names => {
    calls++; assert.deepEqual(names, ['morötter']); return ['vegetables'];
  });
  assert.equal(calls, 1);
  assert.equal(result[0].category, undefined);
  assert.equal(result[1].category, 'vegetables');
  assert.equal(result[2].category, 'vegetables');
  await categorizeNewActions([{ type: 'update', id: 'a', name: 'mjölk', quantity: 5 }], items, () => assert.fail('Ingen AI behövs för ett ändrat antal.'));
});
test('ogiltiga manuella ändringar skickas aldrig vidare till AI', async () => {
  await assert.rejects(categorizeNewActions([{ type: 'add', name: 'mjölk', quantity: 0 }], [], () => assert.fail('Ingen AI får anropas.')), /Antalet/);
});
test('röstkommandon stöder antal, kategori och uttrycklig borttagning', async () => {
  const actions = [{ type: 'add', id: null, name: 'potatis', quantity: 2, category: 'vegetables' }, { type: 'remove', id: 'a', name: 'mjölk', quantity: null, category: null }];
  assert.deepEqual(await interpret('Två påsar potatis och ta bort mjölken', [{ id: 'a', name: 'mjölk', checked: false }], 'test-key', async (_, options) => {
    const body = JSON.parse(options.body);
    const schema = body.response_format.json_schema.schema.properties.actions.items.properties;
    assert.ok(schema.type.enum.includes('remove'));
    assert.ok(schema.category.enum.includes('frozen'));
    assert.equal(JSON.parse(body.messages[1].content).items[0].quantity, 1);
    return reply({ actions });
  }), actions);
  await assert.rejects(interpret('mjölk', [], 'test-key', async () => reply({ actions: [{ type: 'add', name: 'mjölk', category: 'unknown' }] })), /kategori/);
});

test('köksassistenten får samma instruktion och validerade skafferiåtgärder', async () => {
  const items = [{ id: 'mince', name: 'köttfärs', category: 'meat', quantity: 2, checked: false }];
  const original = structuredClone(items);
  for (const text of ['Vi lagade köttfärssås idag', 'Hur mycket protein innehåller linser?', 'Hur fungerar Checka ut varor?']) {
    const answer = await chatWithList(text, items, 'test-key', [], async (_, options) => {
      const body = JSON.parse(options.body);
      assert.ok(body.messages[0].content.startsWith(matgladInstructions));
      assert.equal(JSON.parse(body.messages[1].content).command, text);
      const actionTypes = body.response_format.json_schema.schema.properties.actions.items.properties.type.enum;
      assert.deepEqual(actionTypes, ['add', 'check', 'uncheck', 'update', 'remove', 'pantry_add', 'pantry_use', 'pantry_remove', 'pantry_category', 'pantry_buy', 'pantry_low', 'undo']);
      return reply({ reply: 'Ett matsvar utan någon lager- eller liständring.', actions: [] });
    });
    assert.deepEqual(answer.actions, []);
  }
  await interpret('Vi lagade köttfärssås idag', items, 'test-key', async (_, options) => {
    assert.ok(JSON.parse(options.body).messages[0].content.startsWith(matgladInstructions));
    return reply({ actions: [] });
  });
  assert.deepEqual(items, original);
  await assert.rejects(chatWithList('Dra av köttfärs', items, 'test-key', [], async () => reply({ reply: 'Klart', actions: [{ type: 'consume', name: 'köttfärs', quantity: 1 }] })), /liständringen/);
});
