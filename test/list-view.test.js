import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { renderList } from '../public/list-view.js';

function setup() {
  const { document, window } = parseHTML('<html><body><div id="items"></div></body></html>');
  return { container: document.getElementById('items'), window };
}
const items = [
  { id: 'a', name: 'mjölk', category: 'dairy', quantity: 2, checked: false },
  { id: 'b', name: 'potatis', category: 'vegetables', quantity: 1, checked: true },
  { id: 'c', name: 'lök', category: 'vegetables', quantity: 1, checked: false }
];
test('gränssnittet visar endast fyllda kategorier i butiksordning och behåller bockade varor', () => {
  const { container } = setup();
  renderList(container, [], () => {});
  assert.equal(container.querySelectorAll('h3').length, 0);
  renderList(container, items, () => {});
  assert.deepEqual([...container.querySelectorAll('h3')].map(h => h.textContent), ['Grönsaker', 'Mejeri']);
  assert.deepEqual([...container.querySelectorAll('[data-item-id]')].map(row => row.dataset.itemId), ['b', 'c', 'a']);
  renderList(container, items.map(i => ({ ...i, checked: !i.checked })), () => {});
  assert.deepEqual([...container.querySelectorAll('[data-item-id]')].map(row => row.dataset.itemId), ['b', 'c', 'a']);
  renderList(container, items.filter(i => i.category !== 'vegetables'), () => {});
  assert.deepEqual([...container.querySelectorAll('h3')].map(h => h.textContent), ['Mejeri']);
});
test('antal, kategori och borttagning har separata kontroller och ändrar rätt artikel', () => {
  const { container, window } = setup(); const actions = [];
  renderList(container, [items[0]], action => actions.push(action));
  const row = container.querySelector('.item');
  const number = row.querySelector('input[type=number]');
  assert.equal(number.value, '2');
  number.value = '4'; number.dispatchEvent(new window.Event('change'));
  assert.deepEqual(actions.pop(), { type: 'update', id: 'a', name: 'mjölk', quantity: 4 });
  number.value = '0'; number.dispatchEvent(new window.Event('change'));
  assert.equal(number.value, '2'); assert.equal(actions.length, 0);
  row.querySelector('button[aria-label="Öka antal mjölk"]').click();
  assert.equal(actions.pop().quantity, 3);
  const select = row.querySelector('select');
  select.querySelector('option[value=drinks]').selected = true;
  select.dispatchEvent(new window.Event('change'));
  assert.deepEqual(actions.pop(), { type: 'update', id: 'a', name: 'mjölk', category: 'drinks' });
  const remove = row.querySelector('.remove-item');
  assert.equal(remove.closest('label'), null);
  remove.click();
  assert.deepEqual(actions.pop(), { type: 'remove', id: 'a', name: 'mjölk' });
  assert.equal(row.querySelector('input[type=checkbox]').checked, false);
});
test('antal kan inte minskas under ett och nätverksarbete låser radkontrollerna', () => {
  const { container } = setup();
  renderList(container, [items[1]], () => {});
  assert.equal(container.querySelector('[aria-label="Minska antal potatis"]').disabled, true);
  renderList(container, [items[0]], () => {}, true);
  assert.ok([...container.querySelectorAll('input,select,button')].every(el => el.disabled));
});
