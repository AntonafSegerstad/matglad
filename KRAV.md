# HomeHelper – funktionskrav

## Familjer och översikt – implementerat

- Startskärm med runda namngivna familjeknappar och ”Lägg till familj”. Varje familj har en egen lista.
- Kategoriöversikt med små runda knappar, tre per rad, med symboler, kategorinamn och rött antal varusorter. Tomma kategorier döljs.
- Ett tryck döljer kategoricirkeln och visar små artiklar i samma ruta. Nästa kategori stänger automatiskt den föregående; ingen bred ram öppnas. Avbockade artiklar räknas tills de tas bort.
- Kompakt huvudskärm med familjenamn och familjbytesikon i logoraden. Den gröna panelens storlek är begränsad och påverkas inte av AI-svar.

## Inköpslistan – implementerat

- Gemensam lista med tillägg och avbockning via röst eller manuell inmatning.
- ”Chatta” bredvid ”Börja prata” öppnar ett separat chattfönster med fritextfält för samtal med AI:n, frågor om listan och liständringar.
- AI-kategorisering enligt Elins butiksordning. Kategorier visas endast när de innehåller artiklar.
- Avbockade artiklar behåller sin plats inom kategorin.
- Kategoribyte och borttagning per artikel. Antal kan anges via röst/chatt och visas som text; ingen antalväljare visas.

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
