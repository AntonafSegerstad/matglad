export const DEFAULT_FAMILY_ID = '00000000-0000-4000-8000-000000000001';
export const DEFAULT_FAMILY_NAME = 'Vår familj';

export function validateFamilyId(id = DEFAULT_FAMILY_ID) {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Ogiltig familj.');
  return id.toLowerCase();
}
export function familyName(value) {
  if (typeof value !== 'string') throw new Error('Skriv familjens namn.');
  const name = value.trim().replace(/\s+/g, ' ');
  if (!name || name.length > 60) throw new Error('Familjens namn måste vara 1–60 tecken.');
  return { name, key: name.toLocaleLowerCase('sv') };
}
export function familyNotFound() { return Object.assign(new Error('Familjen finns inte.'), { status: 404 }); }
export function duplicateFamily() { return Object.assign(new Error('En familj med det namnet finns redan.'), { status: 409 }); }
