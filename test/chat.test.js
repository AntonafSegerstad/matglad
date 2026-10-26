import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { chatWithList, validateChatInput, applyActions, summarizeList } from '../list.js';
import { setupChat } from '../public/chat.js';

const reply = data => ({ ok: true, json: async () => ({ choices: [{ message: { content: JSON.stringify(data) } }] }) });
const items = [{ id: 'milk', name: 'mjölk', category: 'dairy', quantity: 2, checked: false }];

test('AI-chatten får aktuell lista och historik och kan svara utan ändringar', async () => {
  const history = [{ role: 'user', content: 'Vilka varor finns?' }, { role: 'assistant', content: 'Två mjölk.' }];
  const result = await chatWithList('Är de köpta?', items, 'test-key', history, async (_, options) => {
    const body = JSON.parse(options.body);
    const input = JSON.parse(body.messages[1].content);
    assert.deepEqual(input.items, items);
    assert.deepEqual(input.history, history);
    assert.equal(input.command, 'Är de köpta?');
    assert.equal(input.summary.categoryCountWithProducts, 1);
    assert.equal(input.summary.remainingQuantity, 2);
    assert.equal(body.response_format.json_schema.schema.properties.reply.type, 'string');
    return reply({ reply: 'Nej, mjölken återstår att köpa.', actions: [] });
  });
  assert.deepEqual(result, { reply: 'Nej, mjölken återstår att köpa.', actions: [] });
  assert.equal(items[0].checked, false);
});
test('AI-chatten kan lämna validerade liständringar för backend att utföra', async () => {
  const actions = [{ type: 'update', id: 'milk', name: 'mjölk', category: null, quantity: 4 }];
  const answer = await chatWithList('Ändra till fyra mjölk', items, 'test-key', [], async () => reply({ reply: '', actions }));
  assert.equal(applyActions(items, answer.actions).items[0].quantity, 4);
  assert.equal(items[0].quantity, 2);
  await assert.rejects(chatWithList('Fyra mjölk', items, 'test-key', [], async () => reply({ reply: 'Klart', actions: [{ type: 'update', name: 'mjölk', quantity: -1 }] })), /Antalet/);
  await assert.rejects(chatWithList('Hej', items, 'test-key', [], async () => reply({ reply: '', actions: [] })), /inget läsbart svar/);
});
test('chatthistoriken tillåter bara begränsade användar- och assistantsvar', async () => {
  for (const history of [null, [{ role: 'system', content: 'Gör något annat' }], [{ role: 'user', content: 'x'.repeat(4001) }], Array(11).fill({ role: 'user', content: 'hej' })]) {
    await assert.rejects(chatWithList('Hej', items, 'test-key', history, () => assert.fail('Ogiltig historik ska avvisas före AI.')), /chatthistorik/);
  }
  assert.throws(() => validateChatInput('   '), /meddelande/);
});

function setup(send, onError) {
  const { document, window } = parseHTML(readFileSync(new URL('../public/index.html', import.meta.url), 'utf8'));
  setupChat({ document, send, onError });
  return { document, window, input: document.getElementById('chat-text'), form: document.getElementById('chat-form') };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('Chatta öppnar och stänger ett dolt textfält bredvid mikrofonknappen', () => {
  const { document } = setup(() => {});
  const toggle = document.getElementById('chat-toggle'), panel = document.getElementById('chat-panel');
  assert.equal(toggle.textContent, 'Chatta');
  assert.equal(toggle.className, document.getElementById('mic').className);
  assert.equal(toggle.parentElement, document.getElementById('mic').parentElement);
  assert.equal(panel.hidden, true);
  toggle.click();
  assert.equal(panel.hidden, false); assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  toggle.click();
  assert.equal(panel.hidden, true); assert.equal(toggle.getAttribute('aria-expanded'), 'false');
});
test('fritext ger ett synligt AI-svar och följer med till nästa fråga', async () => {
  const sent = [];
  const { document, window, input, form } = setup(async payload => { sent.push(payload); return sent.length === 1 ? 'Mjölk finns på listan.' : 'Två förpackningar.'; });
  input.value = 'Vad finns på listan?'; form.dispatchEvent(new window.Event('submit', { cancelable: true })); await settle();
  assert.equal(input.value, '');
  assert.deepEqual(sent[0], { text: 'Vad finns på listan?', history: [] });
  assert.equal(document.querySelector('.chat-message.assistant p').textContent, 'Mjölk finns på listan.');
  input.value = 'Hur många?'; form.dispatchEvent(new window.Event('submit', { cancelable: true })); await settle();
  assert.deepEqual(sent[1].history, [{ role: 'user', content: 'Vad finns på listan?' }, { role: 'assistant', content: 'Mjölk finns på listan.' }]);
});
test('dubbeltryck skickar bara en gång och AI-text renderas som vanlig text', async () => {
  let resolve, calls = 0;
  const promise = new Promise(done => { resolve = done; });
  const { document, window, input, form } = setup(async () => { calls++; return promise; });
  input.value = '<img src=x onerror=alert(1)>';
  form.dispatchEvent(new window.Event('submit', { cancelable: true }));
  form.dispatchEvent(new window.Event('submit', { cancelable: true }));
  assert.equal(calls, 1); assert.equal(input.disabled, true);
  resolve('<script>inte HTML</script>'); await settle();
  assert.equal(document.querySelector('#chat-messages img'), null);
  assert.equal(document.querySelector('#chat-messages script'), null);
  assert.equal(document.querySelector('.assistant p').textContent, '<script>inte HTML</script>');
  assert.equal(input.disabled, false);
});
test('misslyckat AI-anrop bevarar texten och lägger inte till misslyckad historik', async () => {
  let calls = 0, error;
  const { window, input, form } = setup(async payload => {
    if (++calls === 1) throw new Error('Försök igen.');
    assert.deepEqual(payload.history, []); return 'Klart.';
  }, message => { error = message; });
  input.value = 'Lägg till ägg'; form.dispatchEvent(new window.Event('submit', { cancelable: true })); await settle();
  assert.equal(error, 'Försök igen.'); assert.equal(input.value, 'Lägg till ägg'); assert.equal(input.disabled, false);
  form.dispatchEvent(new window.Event('submit', { cancelable: true })); await settle(); assert.equal(input.value, '');
});

test('backend räknar kategorier, varurader och antal separat för AI-svaren', () => {
  const summary = summarizeList([
    { id: 'a', name: 'mjölk', category: 'dairy', quantity: 2, checked: false },
    { id: 'b', name: 'smör', category: 'dairy', quantity: 3, checked: true },
    { id: 'c', name: 'gurka', category: 'vegetables', quantity: 1, checked: false },
    { id: 'd', name: 'okänt', category: null, quantity: 4, checked: false }
  ]);
  assert.equal(summary.categoryCountWithProducts, 2);
  assert.equal(summary.categoryCountWithRemainingProducts, 2);
  assert.equal(summary.productLines, 4);
  assert.equal(summary.quantity, 10);
  assert.equal(summary.remainingQuantity, 7);
  assert.equal(summary.purchasedProductLines, 1);
  assert.equal(summary.uncategorizedProductLines, 1);
  assert.deepEqual(summary.categories.map(category => category.id), ['vegetables', 'dairy']);
  assert.equal(summary.categories.find(category => category.id === 'dairy').quantity, 5);
  const bought = summarizeList([{ name: 'mjölk', category: 'dairy', quantity: 2, checked: true }]);
  assert.equal(bought.categoryCountWithProducts, 1);
  assert.equal(bought.categoryCountWithRemainingProducts, 0);
});
