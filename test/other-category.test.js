import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { renderList } from '../public/list-view.js';
import { renderPantry } from '../public/pantry-view.js';
import { groupItems } from '../public/categories.js';
import { applyActions, categorizeNewActions } from '../list.js';
import { createStore } from '../storage.js';

test('Övrigt kan väljas i båda vyerna och är valt även för äldre okategoriserade varor', () => {
  for (const category of ['vegetables', null, 'other']) {
    for (const view of ['shopping', 'pantry']) {
      const { document, window } = parseHTML('<html><body><div id="rows"></div></body></html>');
      const rows = document.getElementById('rows'), actions = [];
      const entries = [{ id: 'a', name: 'testvara', category, checked: false, available: true }];
      const render = view === 'shopping' ? renderList : renderPantry;
      render(rows, entries, action => actions.push(action));
      const select = rows.querySelector('select'), option = select.querySelector('option[value=other]');
      assert.equal(option.textContent, 'Övrigt'); assert.equal(option.hasAttribute('disabled'), false);
      if (category !== 'vegetables') assert.equal(option.selected, true);
      option.selected = true;
      select.dispatchEvent(new window.Event('change'));
      assert.deepEqual(actions[0], { type: view === 'shopping' ? 'update' : 'pantry_category', id: 'a', name: 'testvara', category: 'other' });
    }
  }
  const groups = groupItems([{ category: null }, { category: 'other' }, { category: 'invalid' }]);
  assert.equal(groups.length, 1); assert.equal(groups[0].id, 'other'); assert.equal(groups[0].items.length, 3);
});

test('manuellt vald Övrigt bevaras vid nytt tillägg och AI-kategorisering', async () => {
  const items = [{ id: 'a', name: 'testvara', category: 'other', checked: false, quantity: 1 }];
  const actions = await categorizeNewActions([{ type: 'add', name: 'testvara' }], items, () => assert.fail('Manuellt vald kategori får inte ersättas.'));
  assert.equal(applyActions(items, actions).items[0].category, 'other');
  assert.equal(applyActions(items, [{ type: 'categorize', id: 'a', name: 'testvara', category: 'vegetables' }]).items[0].category, 'other');
});

test('Övrigt sparas för inköp och skafferi och finns kvar efter omstart', async t => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'matglad-other-'));
  const saved = { DATA_DIR: process.env.DATA_DIR, DATABASE_URL: process.env.DATABASE_URL, RENDER: process.env.RENDER };
  process.env.DATA_DIR = dir; delete process.env.DATABASE_URL; delete process.env.RENDER;
  t.after(async () => { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } await rm(dir, { recursive: true, force: true }); });
  let store = await createStore();
  const initial = await store.commit([{ type: 'add', name: 'testvara', category: 'vegetables' }, { type: 'pantry_add', name: 'testvara', category: 'vegetables' }]);
  await store.commit([{ type: 'update', id: initial.items[0].id, name: 'testvara', category: 'other' }, { type: 'pantry_category', id: initial.pantry[0].id, name: 'testvara', category: 'other' }]);
  store = await createStore();
  const result = await store.readState();
  assert.equal(result.items[0].category, 'other'); assert.equal(result.pantry[0].category, 'other');
});
