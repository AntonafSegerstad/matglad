import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { renderCategoryDashboard } from '../public/dashboard.js';
import { renderFamilyButtons } from '../public/families-view.js';
import { DEFAULT_FAMILY_ID, validateFamilyId, familyName } from '../families.js';

const setup = () => parseHTML('<html><body><div id="grid"></div></body></html>');
test('kategorikort visar ikon, namn och antal varusorter, inte förpackningar', () => {
  const { document } = setup(), grid = document.getElementById('grid');
  const selected = [];
  const items = [
    { id: 'a', name: 'lamm', category: 'meat', quantity: 5, checked: false },
    { id: 'b', name: 'köttfärs', category: 'meat', quantity: 3, checked: true },
    { id: 'c', name: 'gurka', category: 'vegetables', quantity: 9, checked: false }
  ];
  renderCategoryDashboard(grid, items, id => selected.push(id));
  assert.deepEqual([...grid.querySelectorAll('button')].map(button => button.dataset.category), ['vegetables', 'meat']);
  const meat = grid.querySelector('[data-category=meat]');
  assert.equal(meat.querySelector('.category-badge').textContent, '2');
  assert.equal(meat.querySelector('.category-tile-label').textContent, 'Kött');
  assert.ok(meat.querySelector('svg'));
  meat.click(); assert.deepEqual(selected, ['meat']);
  renderCategoryDashboard(grid, items.filter(item => item.category !== 'meat'), () => {});
  assert.equal(grid.querySelector('[data-category=meat]'), null);
  renderCategoryDashboard(grid, [], () => {}); assert.equal(grid.children.length, 0);
});
test('familjer visas som namngivna knappar utan listväljare och väljer rätt familj', () => {
  const { document } = setup(), grid = document.getElementById('grid');
  const families = [{ id: DEFAULT_FAMILY_ID, name: 'Vår familj' }, { id: '11111111-1111-4111-8111-111111111111', name: 'Elins familj' }];
  let selected;
  renderFamilyButtons(grid, families, family => { selected = family; });
  assert.equal(grid.querySelector('select'), null);
  assert.deepEqual([...grid.querySelectorAll('.family-button')].map(button => button.textContent), ['Vår familj', 'Elins familj']);
  grid.querySelectorAll('button')[1].click(); assert.equal(selected.id, families[1].id);
  renderFamilyButtons(grid, families, () => {}, true); assert.ok([...grid.querySelectorAll('button')].every(button => button.disabled));
});
test('familjenamn och familje-id valideras utan att kunna användas som filsökvägar', () => {
  assert.equal(validateFamilyId(), DEFAULT_FAMILY_ID);
  assert.throws(() => validateFamilyId('../../list.json'), /Ogiltig familj/);
  assert.deepEqual(familyName('  Familjen   Öberg  '), { name: 'Familjen Öberg', key: 'familjen öberg' });
  for (const name of ['', '   ', 'x'.repeat(61), null]) assert.throws(() => familyName(name));
});
