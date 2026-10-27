import { CATEGORIES, groupItems } from './categories.js';

const arrows = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h15l-4-4M20 17H5l4 4M19 7l-4 4M5 17l4-4"/></svg>';
export function renderPantry(container, entries, onAction, busy = false) {
  const doc = container.ownerDocument;
  const activeKey = container.contains(doc.activeElement) ? doc.activeElement?.dataset.focusKey : null;
  const fragment = doc.createDocumentFragment();
  for (const group of groupItems(entries)) {
    const section = doc.createElement('section'); section.className = 'pantry-group';
    const heading = doc.createElement('h3'); heading.className = 'category-heading'; heading.textContent = group.label;
    section.append(heading);
    for (const entry of [...group.items].sort((a, b) => a.name.localeCompare(b.name, 'sv'))) {
      const row = doc.createElement('div'); row.className = `pantry-item${entry.available ? '' : ' is-empty'}`; row.dataset.pantryId = entry.id;
      const name = doc.createElement('span'); name.className = 'pantry-name'; name.textContent = entry.name.charAt(0).toLocaleUpperCase('sv') + entry.name.slice(1);
      name.setAttribute('aria-label', `${entry.name}, ${entry.available ? 'finns hemma' : 'slut'}`);
      const tools = doc.createElement('div'); tools.className = 'pantry-tools';
      const action = patch => onAction({ id: entry.id, name: entry.name, ...patch });
      function button(symbol, label, type) {
        const el = doc.createElement('button'); el.type = 'button'; el.className = 'pantry-tool'; el.textContent = symbol;
        el.setAttribute('aria-label', `${label} ${entry.name}`); el.title = `${label} ${entry.name}`;
        el.dataset.focusKey = `${entry.id}:${type}`; el.disabled = busy;
        el.addEventListener('click', () => action({ type })); return el;
      }
      const buy = button('+', 'Lägg på inköpslistan:', 'pantry_buy');
      const remove = button('−', 'Ta bort från skafferiet:', 'pantry_remove');
      const change = doc.createElement('label'); change.className = 'category-change pantry-tool'; change.title = `Byt kategori för ${entry.name}`;
      const icon = doc.createElement('span'); icon.innerHTML = arrows;
      const select = doc.createElement('select'); select.className = 'category-select'; select.disabled = busy;
      select.dataset.focusKey = `${entry.id}:category`; select.setAttribute('aria-label', `Kategori för ${entry.name}`);
      if (!entry.category) {
        const option = doc.createElement('option'); option.value = ''; option.textContent = 'Välj kategori'; option.selected = true; option.disabled = true; select.append(option);
      }
      for (const category of CATEGORIES) {
        const option = doc.createElement('option'); option.value = category.id; option.textContent = category.label;
        option.selected = category.id === entry.category; select.append(option);
      }
      select.addEventListener('change', () => action({ type: 'pantry_category', category: select.value }));
      change.append(icon, select); tools.append(buy, remove, change); row.append(name, tools); section.append(row);
    }
    fragment.append(section);
  }
  container.replaceChildren(fragment);
  if (activeKey) [...container.querySelectorAll('[data-focus-key]')].find(el => el.dataset.focusKey === activeKey)?.focus({ preventScroll: true });
}
