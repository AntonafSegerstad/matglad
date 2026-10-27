// Elins butiksordning. Samma definition används av gränssnittet och AI:n.
export const CATEGORIES = [
  { id: 'home', label: 'Kök och inredning – vid entrén', examples: 'limstift, servetter, värmeljus' },
  { id: 'herbs-berries', label: 'Färska örter och bär', examples: 'färska blåbär, hallon, jordgubbar, krukörter' },
  { id: 'vegetables', label: 'Grönsaker', examples: 'potatis, lök, gurka, svamp, pak choi, färsk majs' },
  { id: 'fruit', label: 'Frukt', examples: 'banan, citron, äpple, vindruvor, färsk mango' },
  { id: 'bread', label: 'Bröd', examples: 'färskt bröd, knäckebröd, hamburgerbröd, pizzadeg, majskakor' },
  { id: 'meat', label: 'Kött', examples: 'färskt kött, bacon, nötfärs, hamburgare, kyld bearnaise vid köttet' },
  { id: 'poultry', label: 'Kyckling och fågel', examples: 'färsk kyckling, kalkon, fågelfärs' },
  { id: 'fish', label: 'Fisk och skaldjur', examples: 'färsk lax, rökt lax, färska räkor, torsk' },
  { id: 'fresh-pasta', label: 'Färsk pasta och gröt', examples: 'färsk gnocchi, färsk fylld pasta, färska lasagneplattor, risgrynsgröt' },
  { id: 'spreads', label: 'Röror och pålägg', examples: 'hummus, kaviar, räksallad, skaldjursröra' },
  { id: 'cheese', label: 'Ost', examples: 'hårdost, feta, halloumi, mozzarella, färskost, parmesan' },
  { id: 'deli-eggs', label: 'Chark och ägg', examples: 'ägg, falukorv, grillkorv, leverpastej, salami, skinka' },
  { id: 'juice-snacks', label: 'Juice, växtdryck och mellanmål', examples: 'havredryck, juice, smoothie, Risifrutti, små yoghurt, drickyoghurt' },
  { id: 'dairy', label: 'Mejeri', examples: 'mjölk, smör, Bregott, fil, grädde, crème fraiche, keso, stor yoghurt' },
  { id: 'breakfast', label: 'Kex, flingor och sylt', examples: 'kex, frukostflingor, granola, sylt, marmelad' },
  { id: 'baking', label: 'Mjöl, bakning, nötter och torkad frukt', examples: 'mjöl, havregryn, socker, bakpulver, honung, nötter, torkad mango' },
  { id: 'wraps-bags', label: 'Folie, bakplåtspapper och påsar', examples: 'aluminiumfolie, bakplåtspapper, plastfolie, soppåsar, fryspåsar' },
  { id: 'drinks', label: 'Kaffe, te och dryck', examples: 'kaffe, te, kaffefilter, läsk, saft, mineralvatten, folköl' },
  { id: 'world-food', label: 'Världens mat', examples: 'soja, fisksås, risvinäger, teriyaki, snabbnudlar, tacos, tortillas' },
  { id: 'spices', label: 'Torra kryddor', examples: 'salt, svartpeppar, oregano, basilika, kanel, timjan' },
  { id: 'sauces', label: 'Såser, fond, olja och vinäger', examples: 'ketchup, majonnäs, fond, olja, vinäger, dressing, örtsalt, tomatpuré' },
  { id: 'canned-vegetables', label: 'Grönsakskonserver', examples: 'konserverad majs, krossade tomater, passerade tomater, oliver, bostongurka' },
  { id: 'pasta-rice', label: 'Torkad pasta, ris och nudlar', examples: 'makaroner, spaghetti, torkade lasagneplattor, ris, risnudlar' },
  { id: 'cleaning', label: 'Städ, tvätt och papper', examples: 'diskmedel, diskmaskinssalt, tvättmedel, toapapper, hushållspapper, klädnypor' },
  { id: 'hygiene', label: 'Hygien, tandvård och sårvård', examples: 'schampo, tvål, deodorant, tandkräm, tandborste, plåster' },
  { id: 'frozen', label: 'Fryst', examples: 'alla uttryckligen frysta varor: grönsaker, kött, fisk, färdigmat, bär, glass, isbitar' },
  { id: 'sweets', label: 'Godis och snacks', examples: 'chips, choklad, godis, popcorn' },
  { id: 'checkout', label: 'Vid och efter kassan', examples: 'batterier, blomjord, cykelljus, grillkol, tuggummi' },
  { id: 'pharmacy', label: 'Apoteket', examples: 'medicin, melatonin, linsvätska, D-vitamin, apoteksprodukter' },
  { id: 'alcohol', label: 'Systembolaget', examples: 'vin, bubbel, starköl' }
];
export const CATEGORY_IDS = CATEGORIES.map(category => category.id);
export const isCategory = id => CATEGORY_IDS.includes(id);

export function groupItems(items) {
  const groups = CATEGORIES.map(category => ({ ...category, items: [] }));
  const byId = new Map(groups.map(group => [group.id, group]));
  const unassigned = { id: null, label: 'Övrigt', items: [] };
  for (const item of items) (byId.get(item.category) || unassigned).items.push(item);
  return [...groups, unassigned].filter(group => group.items.length > 0);
}
