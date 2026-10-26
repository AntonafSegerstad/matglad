import { groupItems } from './categories.js';
import { renderList } from './list-view.js';

// Small inline symbols share the visual style of the category overview.
const icons = {
  home: '<path d="M9 10h6v11H9zM10 6c0-2 2-4 2-4s2 2 2 4a2 2 0 0 1-4 0ZM12 8v2"/>',
  'herbs-berries': '<path d="M5 19C3 7 10 3 21 3c0 11-5 17-14 14M4 22l12-13"/>',
  vegetables: '<path d="M8 8c3-3 8 2 5 5L3 21 6 10zM14 7l4-5M16 8l6-2M12 5l-1-3M6 14l3 2M10 10l3 2"/>',
  fruit: '<path d="M12 7C6 1 0 8 5 18c2 4 5 1 7 2 2-1 5 2 7-2 5-10-1-17-7-11ZM12 7c-1-4 1-5 3-6"/>',
  bread: '<path d="M5 10C0 10 1 3 6 3h12c5 0 6 7 1 7v11H5z"/>',
  meat: '<path d="M8 8c1-5 8-6 11-3s2 10-3 11L7 7M8 11l-4 4c-4-1-4 5 0 4 0 4 6 3 4-1l5-4"/>',
  poultry: '<path d="M8 12c-4-5 1-11 7-9s7 7 2 11c-3 2-6 0-9-2ZM8 12l-4 5c-3-1-4 3-1 3 0 3 4 3 4 0l5-5"/>',
  fish: '<path d="M6 12S11 2 21 12C11 22 6 12 6 12ZM6 12 2 7v10zM16 11h.01M12 8c-2 3-2 5 0 8"/>',
  'fresh-pasta': '<path d="M3 12h18c-1 6-5 9-9 9s-8-3-9-9ZM8 8c-3-2 2-3 0-6M13 8c-3-2 2-3 0-6M18 8c-3-2 2-3 0-6"/>',
  spreads: '<path d="M3 11h18l-3 10H6zM6 11V7h12v4M9 7V4h6v3M15 7l4-5"/>',
  cheese: '<path d="M3 10 10 3c6 0 10 3 11 7v11H3zM3 10h18M8 15h.01M14 17h.01M19 13h.01M9 7h.01"/>',
  'deli-eggs': '<path d="M20 14c0 5-3 8-8 8s-8-3-8-8S8 2 12 2s8 7 8 12Z"/>',
  'juice-snacks': '<path d="M9 2h6v5l3 5v10H6V12l3-5zM9 6h6M6 14h12"/>',
  dairy: '<path d="M8 2h8v4l3 4v12H5V10l3-4zM8 6h8M5 10h14M10 14h4v5h-4z"/>',
  breakfast: '<path d="M20 10c-5 0-6-4-5-7C4 0-3 14 6 20c8 5 17-2 14-10Z"/><circle cx="8" cy="8" r=".6"/><circle cx="7" cy="14" r=".6"/><circle cx="13" cy="16" r=".6"/>',
  baking: '<path d="M12 22V5M12 13C4 14 3 8 5 5c6 0 7 5 7 8ZM12 18c8 1 9-5 7-8-6 0-7 5-7 8ZM12 8c-4-2-3-6 0-7 3 1 4 5 0 7Z"/>',
  'wraps-bags': '<path d="m3 7 9-5 9 5v11l-9 5-9-5zM3 7l9 5 9-5M12 12v11M8 4l9 5"/>',
  drinks: '<path d="M3 11h14v5c0 8-14 8-14 0zM17 12h2c5 0 4 6-2 6M7 7c-3-2 2-3 0-6M12 7c-3-2 2-3 0-6"/>',
  'world-food': '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c7 6 7 14 0 20-7-6-7-14 0-20ZM4 7h16M4 17h16"/>',
  spices: '<path d="M20 8C21 21 6 25 3 15c7 5 10 1 10-5 0-5 5-6 7-2ZM18 7c-3-3-1-5 2-6"/>',
  sauces: '<path d="M10 2h4v6l4 5v9H6v-9l4-5zM9 2h6M6 15h12"/>',
  'canned-vegetables': '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 10h16M4 16h16"/>',
  'pasta-rice': '<path d="M5 2v7c0 5 6 5 6 0V2M8 2v20M19 2c-4 4-4 8 0 10v10M19 2v10"/>',
  cleaning: '<path d="M8 9h8v13H4V13zM8 9V5h8v4M8 5V2h11v3h-3M16 3h5M18 12l2 2M19 9h3"/>',
  hygiene: '<path d="M8 9h8v13H5V12zM9 9V5h5v4M11 5V2h8M17 2v3"/>',
  frozen: '<path d="M12 2v20M3 7l18 10M3 17 21 7M9 4l3 3 3-3M9 20l3-3 3 3M3 11l4-1-1-4M21 13l-4 1 1 4M3 13l4 1-1 4M21 11l-4-1 1-4"/>',
  sweets: '<path d="m3 3 6 2-4 4zM21 21l-6-2 4-4zM8 7c5-4 13 4 9 9S3 12 8 7ZM9 7l8 9"/>',
  checkout: '<path d="M3 6h16v12H3zM19 10h3v4h-3M7 12h5M9.5 9.5v5"/>',
  pharmacy: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  alcohol: '<path d="M7 2h10l1 7c1 8-13 8-12 0zM12 15v7M7 22h10M6 8h12"/>'
};
const fallback = '<path d="M4 7h16v14H4zM8 7V5a4 4 0 0 1 8 0v2"/>';

export function renderCategoryDashboard(container, items, onSelect, { selectedCategory = null, onAction = () => {}, busy = false } = {}) {
  const doc = container.ownerDocument;
  const active = doc.activeElement;
  const focusKey = active && container.contains(active) ? active.dataset.focusKey : null;
  const slots = new Map([...container.querySelectorAll('.category-slot')].map(slot => [slot.dataset.category, slot]));
  const fragment = doc.createDocumentFragment();
  for (const group of groupItems(items)) {
    const id = group.id ?? 'unassigned';
    let slot = slots.get(id);
    if (!slot) { slot = doc.createElement('div'); slot.className = 'category-slot'; slot.dataset.category = id; }
    let tile = slot.querySelector('.category-tile');
    if (!tile) {
      tile = doc.createElement('button'); tile.type = 'button'; tile.className = `category-tile${group.label.length > 24 ? ' long-label' : ''}`; tile.dataset.category = id;
      const symbol = doc.createElement('span'); symbol.className = `category-symbol${['home', 'wraps-bags'].includes(group.id) ? ' warm' : ''}`;
      symbol.setAttribute('aria-hidden', 'true');
      symbol.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[group.id] || fallback}</svg>`;
      const badge = doc.createElement('span'); badge.className = 'category-badge'; symbol.append(badge);
      const label = doc.createElement('span'); label.className = 'category-tile-label'; label.textContent = group.label;
      tile.append(symbol, label);
      tile.addEventListener('click', () => tile.selectCategory(id, slot));
      slot.append(tile);
    }
    const opened = id === selectedCategory;
    tile.selectCategory = onSelect; tile.disabled = busy; tile.hidden = opened;
    tile.dataset.focusKey = `category:${id}`;
    const remaining = group.items.filter(item => !item.checked).length;
    tile.querySelector('.category-badge').textContent = String(remaining);
    tile.setAttribute('aria-label', `${group.label}, ${remaining} ${remaining === 1 ? 'vara' : 'varor'} kvar, ${group.items.length} totalt`);
    tile.setAttribute('aria-expanded', String(opened));
    slot.classList.toggle('is-open', opened);
    let panel = slot.querySelector('.category-detail');
    if (opened) {
      if (!panel) {
        panel = doc.createElement('section'); panel.className = 'category-detail is-revealing'; panel.dataset.category = id;
        panel.addEventListener('animationend', () => panel.classList.remove('is-revealing'));
        const header = doc.createElement('div'); header.className = 'category-detail-header';
        const title = doc.createElement('h3'); title.className = 'sr-only'; title.textContent = group.label; title.id = `detail-title-${id}`;
        const close = doc.createElement('button'); close.type = 'button'; close.className = 'category-close'; close.textContent = '×'; close.setAttribute('aria-label', `Stäng ${group.label}`);
        close.addEventListener('click', () => panel.closeCategory(id, slot));
        header.append(title, close);
        const list = doc.createElement('div'); list.className = 'category-detail-items';
        panel.append(header, list); panel.setAttribute('aria-labelledby', title.id);
        slot.append(panel);
      }
      panel.id = `detail-${id}`; panel.closeCategory = onSelect;
      panel.querySelector('.category-close').disabled = busy;
      const list = panel.querySelector('.category-detail-items');
      renderList(list, group.items, onAction, busy, { headings: false, compact: true });
    } else panel?.remove();
    fragment.append(slot);
  }
  container.replaceChildren(fragment);
  container.style.marginBottom = '';
  const openSlot = container.querySelector('.category-slot.is-open');
  if (openSlot) positionCategoryPanel(openSlot.querySelector('.category-detail'), openSlot, container);
  if (focusKey) [...container.querySelectorAll('[data-focus-key]')].find(control => control.dataset.focusKey === focusKey)?.focus({ preventScroll: true });
}

// Grow to the longest row while keeping the opened overlay inside the overview.
export function positionCategoryPanel(panel, slot, container) {
  const bounds = container.getBoundingClientRect?.();
  const origin = slot.getBoundingClientRect?.();
  if (!bounds?.width || !origin) return;
  panel.style.maxWidth = `${bounds.width}px`;
  panel.style.left = '0px';
  const width = panel.offsetWidth || panel.getBoundingClientRect?.().width;
  if (!width) return;
  const left = Math.max(bounds.left, Math.min(origin.left, bounds.right - width));
  panel.style.left = `${left - origin.left}px`;
  if (Number.isFinite(origin.top) && Number.isFinite(bounds.bottom) && panel.offsetHeight > 0) {
    container.style.marginBottom = `${Math.max(0, origin.top + panel.offsetHeight - bounds.bottom)}px`;
  }
}
