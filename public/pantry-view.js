import { CATEGORIES, groupItems } from './categories.js';
import { productKey } from './product-name.js';

const arrows = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h15l-4-4M20 17H5l4 4M19 7l-4 4M5 17l4-4"/></svg>';
const cart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3h2l3 12h11l2-8H6M8 15l-1 3h12"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg>';
const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
export function renderPantry(container, entries, onAction, busy = false, { shoppingItems = [] } = {}) {
  const doc = container.ownerDocument;
  const activeKey = container.contains(doc.activeElement) ? doc.activeElement?.dataset.focusKey : null;
  const fragment = doc.createDocumentFragment();
  const key = item => `${productKey(item.name)}:${item.category === 'frozen'}`;
  const shopping = new Set(shoppingItems.filter(item => !item.checked).map(key));
  for (const group of groupItems(entries)) {
    const section = doc.createElement('section'); section.className = 'pantry-group';
    const heading = doc.createElement('h3'); heading.className = 'category-heading'; heading.textContent = group.label;
    section.append(heading);
    for (const entry of [...group.items].sort((a, b) => a.name.localeCompare(b.name, 'sv'))) {
      const queued = !entry.available && (entry.needsRestock || shopping.has(key(entry)));
      const row = doc.createElement('div'); row.className = `pantry-item${entry.available ? '' : ' is-empty'}${queued ? ' is-shopping' : ''}`; row.dataset.pantryId = entry.id;
      const name = doc.createElement('span'); name.className = 'pantry-name'; name.textContent = entry.name.charAt(0).toLocaleUpperCase('sv') + entry.name.slice(1);
      name.setAttribute('aria-label', `${entry.name}, ${entry.available ? 'finns hemma' : 'behöver köpas'}`);
      const tools = doc.createElement('div'); tools.className = 'pantry-tools';
      const action = patch => onAction({ id: entry.id, name: entry.name, ...patch });
      function button(symbol, label, type) {
        const el = doc.createElement('button'); el.type = 'button'; el.className = 'pantry-tool'; el.textContent = symbol;
        el.setAttribute('aria-label', `${label} ${entry.name}`); el.title = `${label} ${entry.name}`;
        el.dataset.focusKey = `${entry.id}:${type}`; el.disabled = busy;
        el.addEventListener('click', () => action({ type })); return el;
      }
      const stock = entry.available ? button('', 'Behöver köpas:', 'pantry_low') : button('', 'Finns hemma igen:', 'pantry_add');
      stock.innerHTML = entry.available ? cart : check;
      const remove = button('−', 'Ta bort från skafferi och Att handla:', 'pantry_remove');
      const change = doc.createElement('label'); change.className = 'category-change pantry-tool'; change.title = `Byt kategori för ${entry.name}`;
      const icon = doc.createElement('span'); icon.innerHTML = arrows;
      const select = doc.createElement('select'); select.className = 'category-select'; select.disabled = busy;
      select.dataset.focusKey = `${entry.id}:category`; select.setAttribute('aria-label', `Kategori för ${entry.name}`);
      const selectedCategory = CATEGORIES.some(category => category.id === entry.category) ? entry.category : 'other';
      for (const category of CATEGORIES) {
        const option = doc.createElement('option'); option.value = category.id; option.textContent = category.label;
        option.selected = category.id === selectedCategory; select.append(option);
      }
      select.addEventListener('change', () => action({ type: 'pantry_category', category: select.value }));
      change.append(icon, select); tools.append(stock, remove, change); row.append(name, tools); section.append(row);
    }
    fragment.append(section);
  }
  container.replaceChildren(fragment);
  if (activeKey) [...container.querySelectorAll('[data-focus-key]')].find(el => el.dataset.focusKey === activeKey)?.focus({ preventScroll: true });
}

