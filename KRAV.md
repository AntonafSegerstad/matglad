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

- ”Checka ut varor” längst ned raderar markerade artiklar i vald familj. Omarkerade artiklar och andra familjers listor bevaras.

## Matkunnig AI – implementerat

- Samma köksassistent för röst och text: frågor om råvaror, recept, matlagning, ingrediensbyten, innehåll och näring, samt hjälp med alla nuvarande listfunktioner.
- Anpassa råd efter uppgivna allergier, kostval, tid, budget och portioner. Näringsberäkningar ska ange underlag, mängd och om de är uppskattningar; exakta produktuppgifter kräver förpackning eller annat faktiskt underlag.
- Listfrågor använder aktuella familjedata. Listan får inte behandlas som bevis för innehållet hemma. Receptförslag och rapporter om lagad mat ändrar inte inköpslistan utan en uttrycklig begäran.
- ”Vi lagade köttfärssås idag” ska förstås som en måltid. AI:n kan förklara troliga ingredienser men får inte hitta på vad som faktiskt användes eller påstå att lager dragits av innan Skafferi finns.

## Skafferi – planerat, nästa separat funktion

- En knapp ”Skafferi” längst upp öppnar den valda familjens varor hemma. Skafferi omfattar också kyl och frys.
- ”Checka ut varor” ska då flytta de markerade varorna och deras antal från inköpslistan till samma familjs skafferi. Överföringen ska sparas atomiskt så att en upprepning inte ger dubbla inköp. Fram till dess gäller dagens borttagning utan lagerregistrering.
- Matcha samma produkt och summera kompatibla mängder utan att slå ihop olika varianter av misstag. Förpackningsantal ska skiljas från gram, milliliter och stycken; en okänd förpackningsstorlek får inte gissas.
- ”Vi lagade X idag” via röst eller chatt ska senare identifiera troliga ingredienser, matcha dem mot familjens skafferi och dra av faktiskt använd mängd. Uttryckliga mängder och familjens bekräftade recept går före standardantaganden. Antagna ingredienser och mängder ska framgå och kunna korrigeras; en kort följdfråga behövs när underlaget inte räcker för ett meningsfullt avdrag.
- Minus betyder minskad mängd i skafferiet. En okänd mängd ska visas som okänd, inte som ett påhittat exakt saldo. Varan får inte automatiskt förklaras slut för att den ingick i en rätt. Saknade råvaror ska inte skapas med påhittat lagersaldo.
- Visa vilka varor och mängder som påverkades och ge möjlighet att rätta eller ångra hela måltidsavdraget. Samma rapport ska inte dras av två gånger vid återförsök. Historik och avdrag ska höra till rätt familj.

Skafferiknapp, lageröverföring och måltidsavdrag ingår inte i denna uppdatering av AI-instruktionen.

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
