export function renderFamilyButtons(container, families, onSelect, busy = false) {
  const doc = container.ownerDocument;
  const fragment = doc.createDocumentFragment();
  for (const family of families) {
    const button = doc.createElement('button');
    button.type = 'button'; button.className = `family-button${family.name.length > 24 ? ' long-name' : ''}`;
    button.textContent = family.name; button.dataset.familyId = family.id;
    button.setAttribute('aria-label', `Öppna ${family.name}`); button.disabled = busy;
    button.addEventListener('click', () => onSelect(family));
    fragment.append(button);
  }
  container.replaceChildren(fragment);
}
