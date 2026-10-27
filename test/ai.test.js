import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyProducts, categorizeNewActions, interpret, chatWithList, applyHousehold } from '../list.js';
import { matgladInstructions } from '../ai-instructions.js';
const reply = data => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(data) } }] }) });

test('100 varor i samtalet når modellen som historik och kan inventeras utan att inköpslistan ändras', async () => {
  const names = ['Escamoles', 'Mopane-maskar', ...Array.from({ length: 98 }, (_, i) => `Ovanlig råvara ${i + 3}`)];
  const history = [{ role: 'user', content: names.map((name, i) => `${i + 1}. ${name}`).join('\n') }, { role: 'assistant', content: 'Vill du lägga till dessa?' }];
  const items = [{ id: 'shopping', name: 'kyckling', category: 'poultry', quantity: 1, checked: false }];
  const pantry = [{ id: 'salt', name: 'salt', category: 'spices', available: true }];
  const answer = await chatWithList('Lägg alla varor i skafferiet', items, 'test-key', history, async (_, options) => {
    const body = JSON.parse(options.body);
    assert.deepEqual(body.messages.slice(1, -1), history);
    assert.equal(JSON.parse(body.messages.at(-1).content).command, 'Lägg alla varor i skafferiet');
    return reply({ reply: '', actions: names.map(name => ({ type: 'pantry_add', name, id: null, quantity: null, category: null })) });
  }, pantry);
  const result = applyHousehold({ items, pantry }, answer.actions);
  assert.deepEqual(result.items, items);
  assert.equal(result.pantry.length, 101);
  assert.deepEqual(result.pantry.slice(1).map(item => item.name), names);
  assert.ok(result.pantry.every(item => item.available));
});

test('inventering med inköps-id matchas till skafferiets egen post eller skapar en ny', async () => {
  const items = [{ id: 'shopping', name: 'mjölk', category: 'dairy', quantity: 1, checked: false }];
  const request = async () => reply({ reply: 'Jag har sparat allt.', actions: [{ type: 'pantry_add', id: 'shopping', name: 'mjölk', quantity: null, category: 'dairy' }] });
  for (const pantry of [[], [{ id: 'pantry', name: 'mjölk', category: 'dairy', available: false }]]) {
    const answer = await chatWithList('Lägg mjölk i skafferiet', items, 'test-key', [], request, pantry);
    assert.equal(answer.actions[0].id, pantry.length ? 'pantry' : null);
    const result = applyHousehold({ items, pantry }, answer.actions);
    assert.equal(result.pantry.length, 1); assert.equal(result.pantry[0].available, true);
    assert.notEqual(result.pantry[0].id, 'shopping');
    assert.deepEqual(result.items, items);
  }
  for (const action of [
    { type: 'pantry_add', id: 'unknown', name: 'mjölk' },
    { type: 'pantry_add', id: 'shopping', name: 'ris' },
    { type: 'pantry_remove', id: 'shopping', name: 'mjölk' }
  ]) await assert.rejects(chatWithList('Inventera', items, 'test-key', [], async () => reply({ reply: '', actions: [action] })), /Ingen ändring sparades/);
});

test('kategorisering kopplas till rätt vara även om AI-svaret är omordnat', async () => {
  const result = await classifyProducts(['mjölk', 'fryst broccoli'], 'test-key', async (_, options) => {
    const body = JSON.parse(options.body);
    const input = JSON.parse(body.messages[1].content);
    assert.equal(input.categories.length, 31);
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
test('röstkommandon stöder kategori och uttrycklig borttagning utan antal', async () => {
  const actions = [{ type: 'add', id: null, name: 'potatis', quantity: null, category: 'vegetables' }, { type: 'remove', id: 'a', name: 'mjölk', quantity: null, category: null }];
  assert.deepEqual(await interpret('Potatis och ta bort mjölken', [{ id: 'a', name: 'mjölk', checked: false }], 'test-key', async (_, options) => {
    const body = JSON.parse(options.body);
    const schema = body.response_format.json_schema.schema.properties.actions.items.properties;
    assert.ok(schema.type.enum.includes('remove'));
    assert.equal(schema.quantity.type, 'null');
    assert.equal(body.model, process.env.OPENAI_COMMAND_MODEL || 'gpt-5-mini');
    if (body.model === 'gpt-5-mini') assert.equal(body.reasoning_effort, 'low');
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
      assert.deepEqual(actionTypes, ['add', 'check', 'uncheck', 'update', 'remove', 'pantry_add', 'pantry_remove', 'pantry_category', 'pantry_buy', 'pantry_low', 'undo']);
      return reply({ reply: 'Ett matsvar utan någon lager- eller liständring.', actions: [] });
    });
    assert.deepEqual(answer.actions, []);
  }
  await interpret('Vi lagade köttfärssås idag', items, 'test-key', async (_, options) => {
    assert.ok(JSON.parse(options.body).messages[0].content.startsWith(matgladInstructions));
    return reply({ actions: [] });
  });
  assert.deepEqual(items, original);
  await assert.rejects(chatWithList('Dra av köttfärs', items, 'test-key', [], async () => reply({ reply: 'Klart', actions: [{ type: 'consume', name: 'köttfärs', quantity: null }] })), /liständringen/);
});

