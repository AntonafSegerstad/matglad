// Pantry tracks product types, never package counts or weights.
export function productName(value) {
  return value.trim().replace(/^\d+(?:[.,]\d+)?\s*(?:kg|g|gram|kilo|ml|cl|dl|l|liter|st|stycken|paket|burkar|burk|förpackningar)\s+/iu, '')
    .replace(/(?:,?\s+)\d+(?:[.,]\d+)?\s*(?:kg|g|gram|kilo|ml|cl|dl|l|liter|st|stycken|paket|burkar|burk|förpackningar)\s*$/iu, '').trim();
}
export const productKey = value => productName(value).toLocaleLowerCase('sv').replace(/\s+/g, ' ');
