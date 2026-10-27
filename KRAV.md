# HomeHelper – funktionskrav

## Familjer och översikt – implementerat

- Startskärm med runda namngivna familjeknappar och ”Lägg till familj”. Varje familj har en egen lista.
- Kategoriöversikt med små runda knappar, tre per rad, med symboler, kategorinamn och rött antal oplockade varusorter. Varje kategori har en egen fast varm pastellfärg. Tomma kategorier döljs.
- Ett tryck döljer kategoricirkeln och visar små artiklar i samma ruta. Öppningen växer nedåt över andra kort utan intern scroll och breddas efter längsta varunamnet, inom skärmens bredd. Nästa kategori stänger den föregående. Avbockade artiklar ligger kvar men räknas inte i den röda siffran.
- Kompakt huvudskärm med familjenamn och familjbytesikon i logoraden. Den gröna panelens storlek är begränsad och påverkas inte av AI-svar.

## Inköpslistan – implementerat

- Gemensam lista med tillägg och avbockning via röst eller manuell inmatning.
- ”Chatta” bredvid ”Börja prata” öppnar ett separat chattfönster med fritextfält för samtal med AI:n, frågor om listan och liständringar.
- AI-kategorisering enligt Elins butiksordning. Kategorier visas endast när de innehåller artiklar.
- Avbockade artiklar behåller sin plats inom kategorin.
- Kategoribyte och borttagning på samma rad som varunamnet. Antal kan anges via röst/chatt och visas som text; ingen antalväljare visas.

- ”Checka ut varor” flyttar markerade artiklar till samma familjs skafferi som varutyper utan mängder. Omarkerade artiklar och andra familjers listor bevaras.

## Matkunnig AI – implementerat

- Samma köksassistent för röst och text: frågor om råvaror, recept, matlagning, ingrediensbyten, innehåll och näring, samt hjälp med alla nuvarande listfunktioner.
- Anpassa råd efter uppgivna allergier, kostval, tid, budget och portioner. Näringsberäkningar ska ange underlag, mängd och om de är uppskattningar; exakta produktuppgifter kräver förpackning eller annat faktiskt underlag.
- Listfrågor använder aktuella familjedata. Listan får inte behandlas som bevis för innehållet hemma. Receptförslag och rapporter om lagad mat ändrar inte inköpslistan utan en uttrycklig begäran.
- Måltidsrapporter identifierar vanliga huvudingredienser för två vuxna och två barn, om inget annat anges. Inventerade huvudingredienser markeras som slut. Smaksättningar utelämnas om de inte uttryckligen anges som slut.

## Skafferi – implementerat

- En knapp med en dörr på glänt öppnar en enkel skafferilista i vald familj. Den omfattar kyl, frys, torrvaror och kryddor.
- Skafferiet börjar tomt. Användaren inventerar via röst, chatt eller manuell inmatning. Manuella varor kan kategoriseras med pilarna; ingen separat AI-kategorisering görs vid manuell inventering.
- Varje rad visar varunamn, en kundvagn för ”slut / dags att köpa”, minus för att radera varan från både skafferi och inköpslista samt pilar för kategoribyte. Plus visas bara för gråa varor och gör dem tillgängliga igen. Varorna grupperas per kategori.
- Mörka varunamn finns hemma. Slut eller för lite kvar visas ljusgrått. Inga mängder eller negativa saldon används.
- En måltidsrapport gråmarkerar matchande inventerade huvudingredienser direkt, även om en liten rest kan finnas kvar. Oinventerade ingredienser skapas inte. Inköpslistan ändras inte av själva måltidsrapporten.
- ”Bara lite pasta kvar” gråmarkerar pasta och lägger den samtidigt som aktiv vara på inköpslistan. Redan avbockade inköpsrader aktiveras utan dubbletter.
- Utcheckning tar bort markerade inköpsrader och fyller på skafferiet i samma sparning. En befintlig grå varutyp återaktiveras. Förpackningsantal och vikt flyttas inte till skafferiet.
- AI:n får aktuell skafferistatus i röst- och chattdialogen. Den kan inventera, registrera förbrukning, hitta saknade huvudingredienser, lägga dem på inköpslistan på begäran och föreslå måltider med tillgängliga varor.
- Ångra återställer senaste ändringen av inköpslista och skafferi tillsammans, inom vald familj. Upp till tio ändringar sparas, även efter omstart. Återförsök med samma ändrings-id utför inte ändringen igen.
- Inköpslista, skafferi och ångrahistorik sparas atomiskt. Samtidiga ändringar versionskontrolleras. Ett AI-svar som utgår från en gammal version får inte skriva över nyare inventering.
- Den tilläggande databasmigreringen finns i migrations/003_pantry.sql. Tidigare inköpsdata bevaras.

## Kvittoskanning – planerat

Användaren ska kunna fotografera ett kvitto och låta AI registrera vad som faktiskt har köpts i hushållets listor.

- Ta foto direkt i appen eller välj en befintlig kvittobild.
- AI läser kvittots varurader och identifierar produkter och köpta antal. Förkortade butiksnamn översätts till begripliga produktnamn.
- Matcha köpta produkter mot befintliga artiklar för att undvika dubbletter. Registrera inköpet och bocka av det som är färdigköpt. Vid delköp ska återstående behov framgå.
- Lägg till köpta produkter som saknas på listan i rätt kategori och markera dem som inhandlade. Manuellt valda kategorier för befintliga artiklar ska bevaras.
- Skilj antal förpackningar från vikt och volym. Summeringar, moms, rabatter och betalningsrader ska inte bli artiklar.
- Visa vad som lästs in. Användaren ska enkelt kunna rätta produkt, antal och kategori samt ta bort en feltolkad rad. Oläsliga uppgifter ska framgå utan att AI hittar på innehåll.
- Samma kvitto ska inte kunna registrera samma inköp flera gånger av misstag.

När köphistorik och lagerfunktioner byggs ska kvittots inköpsuppgifter också kunna användas för att fylla på dessa. Kvittoskanning är ännu inte implementerad.
