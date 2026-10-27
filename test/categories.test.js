import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, CATEGORY_IDS, groupItems } from '../public/categories.js';

test('kategorierna följer den överenskomna butiksordningen', () => {
  assert.deepEqual(CATEGORIES.map(c => c.label), [
    'Kök och inredning – vid entrén', 'Färska örter och bär', 'Grönsaker', 'Frukt', 'Bröd', 'Kött',
    'Kyckling och fågel', 'Fisk och skaldjur', 'Färsk pasta och gröt', 'Röror och pålägg', 'Ost',
    'Chark och ägg', 'Juice, växtdryck och mellanmål', 'Mejeri', 'Kex, flingor och sylt',
    'Mjöl, bakning, nötter och torkad frukt', 'Folie, bakplåtspapper och påsar', 'Kaffe, te och dryck',
    'Världens mat', 'Torra kryddor', 'Såser, fond, olja och vinäger', 'Grönsakskonserver',
    'Pasta, Ris och nudlar', 'Städ, tvätt och papper', 'Hygien, tandvård och sårvård',
    'Fryst', 'Godis och snacks', 'Vid och efter kassan', 'Apoteket', 'Systembolaget'
  ]);
  assert.equal(new Set(CATEGORY_IDS).size, 30);
});
test('tomma kategorier döljs och bockade varor behåller sin plats', () => {
  assert.deepEqual(groupItems([]), []);
  const items = [
    { id: 'milk', category: 'dairy', checked: false },
    { id: 'potato', category: 'vegetables', checked: true },
    { id: 'onion', category: 'vegetables', checked: false },
    { id: 'ice', category: 'frozen', checked: true }
  ];
  const groups = groupItems(items);
  assert.deepEqual(groups.map(g => g.id), ['vegetables', 'dairy', 'frozen']);
  assert.deepEqual(groups[0].items.map(i => i.id), ['potato', 'onion']);
  items[1].checked = false; items[2].checked = true;
  assert.deepEqual(groupItems(items)[0].items.map(i => i.id), ['potato', 'onion']);
  assert.equal(groupItems([{ category: null }]).at(-1).label, 'Övrigt');
});
