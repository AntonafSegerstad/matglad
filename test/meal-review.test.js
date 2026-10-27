import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatWithList, applyHousehold } from '../list.js';

const respond = data => Response.json({ choices: [{ message: { content: JSON.stringify(data) } }] });
const ingredient = (name, category, role = 'main', extra = {}) => ({ name, id: null, category, role, explicit: false, enough_remaining: false, replenishment: true, ...extra });
const pantry = [
  { id: 'beef', name: 'nötfärs', category: 'meat', available: true },
  { id: 'potato', name: 'potatis', category: 'vegetables', available: true },
  { id: 'salt', name: 'salt', category: 'spices', available: true },
  { id: 'oil', name: 'olivolja', category: 'sauces', available: true }
];
async function reviewed(plan, actions = [{ type: 'pantry_low', id: 'potato', name: 'potatis', category: 'vegetables' }], requestCheck = () => {}) {
  return chatWithList('Köttfärssås till middag åt vi', [], 'fake', [], async (_, options) => {
    const body = JSON.parse(options.body);
    requestCheck(body);
    if (body.response_format.json_schema.name === 'meal_review') return respond(plan);
    return respond({ reply: '', actions });
  }, pantry);
}

test('separat maträttsbedömning ersätter fel ingredienser och filtrerar kryddor, olja och antagna tillbehör', async () => {
  const plan = { intent: 'meal_report', clarification: '', ingredients: [
    ingredient('nötfärs', 'meat', 'main', { id: 'beef' }),
    ingredient('krossade tomater', 'canned-vegetables', 'base'),
    ingredient('potatis', 'vegetables', 'side', { id: 'potato' }),
    ingredient('salt', 'spices', 'seasoning', { id: 'salt' }),
    ingredient('olivolja', 'sauces', 'staple', { id: 'oil' }),
    ingredient('vitlök', 'vegetables', 'seasoning'),
    ingredient('timjan', 'spices', 'seasoning')
  ] };
  const answer = await reviewed(plan);
  const result = applyHousehold({ items: [], pantry }, answer.actions);
  assert.deepEqual(result.items.map(item => item.name), ['nötfärs', 'krossade tomater']);
  assert.equal(result.pantry.find(item => item.id === 'beef').available, false);
  for (const id of ['potato', 'salt', 'oil']) assert.equal(result.pantry.find(item => item.id === id).available, true);
  assert.equal(result.message, 'Varorna nötfärs och krossade tomater har lagts i Att handla.');
  assert.doesNotMatch(result.message, /slut|ljusgrå|röd post/);
  const repeated = applyHousehold(result, answer.actions);
  assert.equal(repeated.items.length, 2);
});

test('måltidsbedömning respekterar rester, nämnda tillbehör och uttryckligt inget återköp', async () => {
  const answer = await reviewed({ intent: 'meal_report', clarification: '', ingredients: [
    ingredient('nötfärs', 'meat', 'main', { id: 'beef', enough_remaining: true }),
    ingredient('potatis', 'vegetables', 'side', { id: 'potato', explicit: true }),
    ingredient('krossade tomater', 'canned-vegetables', 'base', { replenishment: false })
  ] });
  const result = applyHousehold({ items: [], pantry }, answer.actions);
  assert.deepEqual(result.items.map(item => item.name), ['potatis']);
  assert.equal(result.pantry.find(item => item.id === 'beef').available, true);
  assert.equal(result.pantry.some(item => item.name === 'krossade tomater'), false);
});

test('osäker maträtt och nekad eller framtida måltid kan stoppa preliminär förbrukning', async () => {
  for (const plan of [
    { intent: 'meal_report', clarification: 'Vad innehöll rätten?', ingredients: [] },
    { intent: 'no_change', clarification: '', ingredients: [] }
  ]) {
    const answer = await reviewed(plan);
    assert.deepEqual(answer.actions, []); assert.ok(answer.reply);
  }
  await assert.rejects(reviewed({ intent: 'meal_report', clarification: '', ingredients: [ingredient('lax', 'fish', 'main', { id: 'beef' })] }), /säkert matcha/);
});

test('tydligt inköpsbehov använder vanliga tillägg utan extra maträttsbedömning', async () => {
  let calls = 0;
  const answer = await chatWithList('Vi behöver köpa mörkt bröd', [], 'fake', [], async (_, options) => {
    calls++;
    assert.equal(JSON.parse(options.body).response_format.json_schema.name, 'list_chat');
    return respond({ reply: '', actions: [{ type: 'add', name: 'mörkt bröd', id: null, quantity: null, category: 'bread' }] });
  });
  assert.equal(calls, 1);
  assert.equal(applyHousehold({ items: [], pantry: [] }, answer.actions).items[0].name, 'mörkt bröd');
});

test('oberoende inköpsönskemål bevaras när en måltid bedöms', async () => {
  const answer = await reviewed({ intent: 'meal_report', clarification: '', ingredients: [ingredient('nötfärs', 'meat', 'main', { id: 'beef' })] }, [
    { type: 'pantry_low', name: 'potatis', id: 'potato', category: 'vegetables' },
    { type: 'add', name: 'mörkt bröd', category: 'bread' }
  ]);
  assert.deepEqual(applyHousehold({ items: [], pantry }, answer.actions).items.map(item => item.name), ['mörkt bröd', 'nötfärs']);
});
