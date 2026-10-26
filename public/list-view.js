import { CATEGORIES, groupItems } from './categories.js';

const trashIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>';

export function renderList(container, items, onAction, busy = false, { headings = true } = {}) {
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
      row.className = `item${item.checked ? ' done' : ''}`;
      row.dataset.itemId = item.id;
      const action = patch => onAction({ name: item.name, id: item.id, ...patch });
      const track = (control, suffix) => { control.dataset.focusKey = `${item.id}:${suffix}`; return control; };
      const label = doc.createElement('label'); label.className = 'item-check';
      const check = track(doc.createElement('input'), 'check');
      check.type = 'checkbox'; check.checked = Boolean(item.checked); check.disabled = busy;
      const text = doc.createElement('span'); text.className = 'item-name'; text.textContent = item.name;
      check.addEventListener('change', () => action({ type: check.checked ? 'check' : 'uncheck' }));
      label.append(check, text);
      const remove = track(doc.createElement('button'), 'remove');
      remove.type = 'button'; remove.className = 'remove-item'; remove.disabled = busy;
      remove.setAttribute('aria-label', `Ta bort ${item.name}`); remove.title = `Ta bort ${item.name}`;
      remove.innerHTML = trashIcon;
      remove.addEventListener('click', () => action({ type: 'remove' }));
      const amount = doc.createElement('div'); amount.className = 'quantity-control';
      amount.setAttribute('role', 'group'); amount.setAttribute('aria-label', `Antal ${item.name}`);
      const quantity = item.quantity ?? 1;
      const minus = track(doc.createElement('button'), 'minus');
      minus.type = 'button'; minus.textContent = '−'; minus.disabled = busy || quantity <= 1;
      minus.setAttribute('aria-label', `Minska antal ${item.name}`);
      minus.addEventListener('click', () => action({ type: 'update', quantity: quantity - 1 }));
      const number = track(doc.createElement('input'), 'quantity');
      number.type = 'number'; number.min = '1'; number.max = '999'; number.step = '1';
      number.inputMode = 'numeric'; number.value = String(quantity); number.disabled = busy;
      number.setAttribute('aria-label', `Antal ${item.name}`);
      number.addEventListener('change', () => {
        const value = Number(number.value);
        if (!Number.isInteger(value) || value < 1 || value > 999) { number.value = String(quantity); return; }
        if (value !== quantity) action({ type: 'update', quantity: value });
      });
      const plus = track(doc.createElement('button'), 'plus');
      plus.type = 'button'; plus.textContent = '+'; plus.disabled = busy || quantity >= 999;
      plus.setAttribute('aria-label', `Öka antal ${item.name}`);
      plus.addEventListener('click', () => action({ type: 'update', quantity: quantity + 1 }));
      amount.append(minus, number, plus);
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
      row.append(label, amount, category, remove);
      section.append(row);
    }
    fragment.append(section);
  }
  container.replaceChildren(fragment);
  if (focusKey) [...container.querySelectorAll('[data-focus-key]')].find(control => control.dataset.focusKey === focusKey)?.focus();
}
