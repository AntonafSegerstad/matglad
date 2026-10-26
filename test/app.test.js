import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { DEFAULT_FAMILY_ID } from '../families.js';

const settle = () => new Promise(resolve => setImmediate(resolve));
test('startskärm, familjval, kategorikort och anrop följer vald familj', async t => {
  const { document, window } = parseHTML(readFileSync(new URL('../public/index.html', import.meta.url), 'utf8'));
  Object.defineProperty(document, 'activeElement', { get: () => document.body });
  const saved = { document: globalThis.document, fetch: globalThis.fetch, setInterval: globalThis.setInterval };
  t.after(() => { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } });
  globalThis.document = document;
  globalThis.setInterval = () => 1;
  const other = '11111111-1111-4111-8111-111111111111';
  const families = [{ id: DEFAULT_FAMILY_ID, name: 'Vår familj' }, { id: other, name: 'Elins familj' }];
  const lists = new Map([
    [DEFAULT_FAMILY_ID, [{ id: 'lamb', name: 'lamm', category: 'meat', quantity: 5, checked: false }, { id: 'mince', name: 'köttfärs', category: 'meat', quantity: 3, checked: false }, { id: 'onion', name: 'lök', category: 'vegetables', quantity: 1, checked: false }]],
    [other, []]
  ]);
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = new URL(url, 'http://test'); requests.push({ target, options });
    if (target.pathname === '/api/families') return { ok: true, json: async () => ({ families }) };
    const id = target.searchParams.get('familyId'); assert.ok(id, 'Listan måste alltid begäras med vald familj.');
    assert.ok(lists.has(id));
    if (target.pathname === '/api/actions') {
      const { actions } = JSON.parse(options.body);
      assert.equal(actions[0].type, 'add');
      lists.get(id).push({ id: 'cucumber', name: actions[0].name, category: 'vegetables', quantity: 1, checked: false });
      return { ok: true, json: async () => ({ items: structuredClone(lists.get(id)), message: 'Lade till gurka.' }) };
    }
    return { ok: true, json: async () => ({ items: structuredClone(lists.get(id)), voiceEnabled: true }) };
  };
  await import('../public/app.js?families-test');
  assert.equal(document.getElementById('family-screen').hidden, false);
  assert.equal(document.getElementById('shopping-screen').hidden, true);
  document.querySelector(`[data-family-id="${DEFAULT_FAMILY_ID}"]`).click(); await settle();
  assert.equal(document.getElementById('shopping-screen').hidden, false);
  assert.equal(document.getElementById('active-family').textContent, 'Vår familj');
  const tile = document.querySelector('#category-grid .category-tile[data-category=meat]');
  assert.equal(tile.querySelector('.category-badge').textContent, '2');
  assert.ok(document.querySelector('.app-header').contains(document.getElementById('active-family')));
  const vegetables = document.querySelector('#category-grid .category-tile[data-category=vegetables]');
  tile.click();
  assert.equal(document.getElementById('category-grid').hidden, false);
  assert.equal(document.querySelector('.category-detail[data-category=meat]').querySelectorAll('.item').length, 2);
  assert.equal(tile.hidden, true);
  assert.equal(document.querySelector('.category-detail[data-category=meat]').parentElement, tile.parentElement);
  vegetables.click();
  assert.equal(document.querySelectorAll('.category-detail').length, 1);
  assert.equal(document.querySelector('.category-detail').dataset.category, 'vegetables');
  assert.equal(tile.hidden, false);
  assert.equal(vegetables.hidden, true);
  assert.equal(document.querySelector('#category-grid .category-tile[data-category=meat]'), tile);
  vegetables.click();
  assert.equal(document.querySelector('.category-detail'), null);
  document.getElementById('family-back').click(); await settle();
  document.querySelector(`[data-family-id="${other}"]`).click(); await settle();
  assert.equal(document.getElementById('active-family').textContent, 'Elins familj');
  assert.equal(document.getElementById('category-grid').children.length, 0);
  assert.equal(document.getElementById('empty').hidden, false);
  document.getElementById('item').value = 'gurka';
  document.getElementById('add-form').dispatchEvent(new window.Event('submit', { cancelable: true })); await settle();
  assert.equal(lists.get(DEFAULT_FAMILY_ID).length, 3);
  assert.equal(lists.get(other).length, 1);
  assert.equal(requests.find(request => request.target.pathname === '/api/actions').target.searchParams.get('familyId'), other);
  assert.equal(document.getElementById('category-grid').querySelectorAll('button').length, 1);
});
