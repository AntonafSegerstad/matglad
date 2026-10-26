import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { renderCategoryDashboard, positionCategoryPanel } from '../public/dashboard.js';
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
  const meat = grid.querySelector('.category-tile[data-category=meat]');
  assert.equal(meat.querySelector('.category-badge').textContent, '1');
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

test('ett kort öppnas på plats och stängs när nästa kategori väljs', () => {
  const { document } = setup(), grid = document.getElementById('grid');
  const items = [{ id: 'v', name: 'gurka', category: 'vegetables', quantity: 1 }, { id: 'm', name: 'lamm', category: 'meat', quantity: 1 }, { id: 'd', name: 'mjölk', category: 'dairy', quantity: 1 }];
  let selectedCategory = null; const actions = [];
  function draw() { renderCategoryDashboard(grid, items, id => { selectedCategory = selectedCategory === id ? null : id; draw(); }, { selectedCategory, onAction: action => actions.push(action) }); }
  draw();
  const vegetables = grid.querySelector('.category-tile[data-category=vegetables]');
  const meat = grid.querySelector('.category-tile[data-category=meat]');
  vegetables.click();
  assert.equal(grid.querySelectorAll('.category-detail').length, 1);
  assert.equal(grid.querySelector('.category-detail').dataset.category, 'vegetables');
  assert.equal(grid.children[0].classList.contains('category-slot'), true);
  assert.equal(grid.children[0].querySelector('.category-detail').dataset.category, 'vegetables');
  assert.equal(vegetables.hidden, true);
  assert.equal(grid.children.length, 3);
  assert.equal(grid.querySelectorAll('.category-tile').length, 3);
  meat.click();
  assert.equal(grid.querySelectorAll('.category-detail').length, 1);
  assert.equal(grid.querySelector('.category-detail').dataset.category, 'meat');
  assert.equal(vegetables.getAttribute('aria-expanded'), 'false');
  assert.equal(vegetables.hidden, false);
  assert.equal(meat.hidden, true);
  assert.equal(grid.querySelector('.category-detail').parentElement, meat.parentElement);
  assert.equal(grid.querySelector('.category-detail input[type=number]'), null);
  assert.equal(meat.getAttribute('aria-expanded'), 'true');
  grid.querySelector('.category-detail .item-check input').dispatchEvent(new document.defaultView.Event('change'));
  assert.equal(actions[0].id, 'm');
  grid.querySelector('.category-close').click();
  assert.equal(grid.querySelector('.category-detail'), null);
  assert.equal(grid.querySelector('.category-tile[data-category=meat]'), meat);
  grid.querySelector('.category-tile[data-category=dairy]').click();
  assert.equal(grid.lastElementChild.dataset.category, 'dairy');
  assert.equal(grid.lastElementChild.classList.contains('category-slot'), true);
  assert.ok(grid.lastElementChild.querySelector('.category-detail'));
  assert.equal(grid.lastElementChild.querySelector('.category-tile').hidden, true);
});

test('röda antalet minskar vid avbockning medan artiklar och kategori finns kvar', () => {
  const { document } = setup(), grid = document.getElementById('grid');
  const items = [{ id: 'a', name: 'lamm', category: 'meat', checked: false }, { id: 'b', name: 'köttfärs', category: 'meat', checked: false }];
  renderCategoryDashboard(grid, items, () => {});
  assert.equal(grid.querySelector('.category-badge').textContent, '2');
  items[0].checked = true; renderCategoryDashboard(grid, items, () => {}, { selectedCategory: 'meat' });
  assert.equal(grid.querySelector('.category-badge').textContent, '1');
  assert.equal(grid.querySelectorAll('.item').length, 2);
  items[1].checked = true; renderCategoryDashboard(grid, items, () => {});
  assert.equal(grid.querySelector('.category-badge').textContent, '0');
  assert.equal(grid.querySelectorAll('.category-tile').length, 1);
  items[0].checked = false; renderCategoryDashboard(grid, items, () => {});
  assert.equal(grid.querySelector('.category-badge').textContent, '1');
});
test('en bred öppnad lista flyttas åt vänster vid översiktens högra kant', () => {
  const { document } = setup();
  const grid = document.getElementById('grid'), slot = document.createElement('div'), panel = document.createElement('section');
  grid.getBoundingClientRect = () => ({ left: 16, right: 376, width: 360, bottom: 200 });
  slot.getBoundingClientRect = () => ({ left: 256, top: 100 });
  Object.defineProperty(panel, 'offsetHeight', { value: 180 });
  panel.getBoundingClientRect = () => ({ width: 210 });
  positionCategoryPanel(panel, slot, grid);
  assert.equal(panel.style.maxWidth, '360px');
  assert.equal(panel.style.left, '-90px');
  assert.equal(grid.style.marginBottom, '80px', 'Utcheckningsknappen ska ligga nedanför en lista som når under rutnätet.');
  slot.getBoundingClientRect = () => ({ left: 16 });
  positionCategoryPanel(panel, slot, grid);
  assert.equal(panel.style.left, '0px');
});
