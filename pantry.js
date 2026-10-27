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
  let entry;
  if (action.id) {
    entry = pantry.find(item => item.id === action.id);
    if (entry && productKey(entry.name) !== productKey(name)) throw new Error(`Kan inte säkert matcha ${name} i skafferiet. Förtydliga vilken vara du menar.`);
    if (!entry && action.type === 'pantry_use') throw new Error(`Kan inte säkert matcha ${name} i skafferiet. Försök igen.`);
  } else {
    const matches = pantry.filter(item => productKey(item.name) === productKey(name) && (action.category == null || sameProduct(item, { ...action, name })));
    if (matches.length > 1) throw new Error(`Det finns flera varianter av ${name}. Vilken menar du?`);
    entry = matches[0];
  }
  let shopping = null, removed = null, usedId = null, message;
  switch (action.type) {
    case 'pantry_add':
    case 'pantry_low': {
      if (action.id && !entry) { message = `Hittade inte ${name} i skafferiet.`; break; }
      const available = action.type === 'pantry_add';
      if (entry) { entry.available = available; if (available) delete entry.needsRestock; }
      else pantry.push({ id: randomUUID(), name, category: action.category ?? null, available });
      if (!available) shopping = { name, category: entry?.category ?? action.category ?? null };
      message = available ? `${name} finns i skafferiet.` : `${name} har lagts i Att handla.`;
      break;
    }
    case 'pantry_use':
      if (!entry) {
        entry = { id: randomUUID(), name, category: action.category ?? null, available: false, needsRestock: true };
        pantry.push(entry);
      }
      entry.available = false; usedId = entry.id;
      message = `${entry.name} markerades som förbrukad.`;
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
  message = message.charAt(0).toLocaleUpperCase('sv') + message.slice(1);
  return { pantry, shopping, removed, usedId, message };
}

