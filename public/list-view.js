import { CATEGORIES, groupItems } from './categories.js';

const trashIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>';

export function renderList(container, items, onAction, busy = false, { headings = true, compact = false } = {}) {
  const doc = container.ownerDocument;
  const active = doc.activeElement;
  const focusKey = active && container.contains(active) ? active.dataset.focusKey : null;
  const fragment = doc.createDocumentFragment();
  for (const group of groupItems(items)) {
    const section = doc.createElement('section');
    section.className = 'category-group';
    section.dataset.category = group.id ?? 'unassigned';
    const heading = doc.createElement('h3');
    heading.className = 'category-heading';
    heading.id = `category-${group.id ?? 'unassigned'}`;
    heading.textContent = group.label;
    section.setAttribute('aria-labelledby', heading.id);
    if (headings) section.append(heading);
    else { section.removeAttribute('aria-labelledby'); section.setAttribute('aria-label', group.label); }
    for (const item of group.items) {
      const row = doc.createElement('div');
      row.className = `item${compact ? ' compact-item' : ''}${item.checked ? ' done' : ''}`;
      row.dataset.itemId = item.id;
      const action = patch => onAction({ name: item.name, id: item.id, ...patch });
      const track = (control, suffix) => { control.dataset.focusKey = `${item.id}:${suffix}`; return control; };
      const label = doc.createElement('label'); label.className = 'item-check';
      const check = track(doc.createElement('input'), 'check');
      check.type = 'checkbox'; check.checked = Boolean(item.checked); check.disabled = busy;
      const text = doc.createElement('span'); text.className = 'item-name'; text.textContent = item.name.charAt(0).toLocaleUpperCase('sv-SE') + item.name.slice(1);
      check.addEventListener('change', () => action({ type: check.checked ? 'check' : 'uncheck' }));
      label.append(check, text);
      if ((item.quantity ?? 1) > 1) {
        const quantity = doc.createElement('span'); quantity.className = 'item-quantity'; quantity.textContent = `×${item.quantity}`; label.append(quantity);
      }
      const remove = track(doc.createElement('button'), 'remove');
      remove.type = 'button'; remove.className = 'remove-item'; remove.disabled = busy;
      remove.setAttribute('aria-label', `Ta bort ${item.name}`); remove.title = `Ta bort ${item.name}`;
      remove.innerHTML = trashIcon;
      remove.addEventListener('click', () => action({ type: 'remove' }));
      const category = track(doc.createElement('select'), 'category');
      category.className = 'category-select'; category.disabled = busy;
      category.setAttribute('aria-label', `Kategori för ${item.name}`);
      if (!item.category) {
        const placeholder = doc.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Välj kategori'; placeholder.disabled = true; placeholder.selected = true;
        category.append(placeholder);
      }
      for (const optionCategory of CATEGORIES) {
        const option = doc.createElement('option'); option.value = optionCategory.id; option.textContent = optionCategory.label;
        option.selected = optionCategory.id === item.category; category.append(option);
      }
      category.addEventListener('change', () => action({ type: 'update', category: category.value }));
      if (compact) {
        const tools = doc.createElement('div'); tools.className = 'item-tools';
        const change = doc.createElement('label'); change.className = 'category-change'; change.title = `Byt kategori för ${item.name}`;
        const icon = doc.createElement('span'); icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h15l-4-4M20 17H5l4 4M19 7l-4 4M5 17l4-4"/></svg>';
        change.append(icon, category); tools.append(change, remove); row.append(label, tools);
      } else row.append(label, category, remove);
      section.append(row);
    }
    fragment.append(section);
  }
  container.replaceChildren(fragment);
  if (focusKey) [...container.querySelectorAll('[data-focus-key]')].find(control => control.dataset.focusKey === focusKey)?.focus();
}
