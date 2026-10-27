import { randomUUID } from 'node:crypto';
import { isCategory } from './public/categories.js';
import { productName, productKey } from './public/product-name.js';

export const PANTRY_ACTIONS = ['pantry_add', 'pantry_use', 'pantry_remove', 'pantry_category', 'pantry_buy', 'pantry_low'];
export function sameProduct(a, b) {
  return productKey(a.name) === productKey(b.name) && (a.category === 'frozen') === (b.category === 'frozen');
}
export function pantryChange(entries, action) {
  if (!PANTRY_ACTIONS.includes(action?.type) || typeof action.name !== 'string' || !action.name.trim() || action.name.length > 120) throw new Error('Ogiltig skafferiändring.');
  if (action.id != null && (typeof action.id !== 'string' || !action.id || action.id.length > 100)) throw new Error('Ogiltig vara.');
  if (action.quantity != null) throw new Error('Skafferiet använder inte mängder.');
  if (action.category != null && !isCategory(action.category)) throw new Error('Välj en giltig kategori.');
  const pantry = structuredClone(entries);
  const name = productName(action.name);
  if (!name) throw new Error('Skriv ett varunamn.');
  const entry = pantry.find(item => action.id ? item.id === action.id : sameProduct(item, { ...action, name }));
  let shopping = null, removed = null, message;
  switch (action.type) {
    case 'pantry_add':
    case 'pantry_low': {
      if (action.id && !entry) { message = `Hittade inte ${name} i skafferiet.`; break; }
      const available = action.type === 'pantry_add';
      if (entry) entry.available = available;
      else pantry.push({ id: randomUUID(), name, category: action.category ?? null, available });
      if (!available) shopping = { name, category: entry?.category ?? action.category ?? null };
      message = available ? `${name} finns i skafferiet.` : `${name} räcker inte till en måltid. Lades på inköpslistan.`;
      break;
    }
    case 'pantry_use':
      if (entry) { entry.available = false; message = `${entry.name} är slut och visas ljusgrå.`; }
      else message = `${name} var inte inventerad och lades inte till i skafferiet.`;
      break;
    case 'pantry_remove':
      if (entry) { removed = entry; pantry.splice(pantry.indexOf(entry), 1); message = `Tog bort ${entry.name} från skafferiet och inköpslistan.`; }
      else message = `Hittade inte ${name} i skafferiet.`;
      break;
    case 'pantry_category':
      if (!isCategory(action.category)) throw new Error('Välj en giltig kategori.');
      if (entry) { entry.category = action.category; message = `Bytte kategori för ${entry.name} i skafferiet.`; }
      else message = `Hittade inte ${name} i skafferiet.`;
      break;
    case 'pantry_buy':
      if (action.id && !entry) { message = `Hittade inte ${name} i skafferiet.`; break; }
      shopping = { name: entry?.name ?? name, category: entry?.category ?? action.category ?? null };
      message = `${shopping.name} lades på inköpslistan.`;
      break;
  }
  return { pantry, shopping, removed, message };
}
