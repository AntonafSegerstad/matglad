# HomeHelper – första prototypen

En öppen gemensam inköpslista. Lägg till och bocka av med tryck eller röst via ditt OpenAI API-konto. Alla enheter mot samma server delar listan; ändringar hämtas var femte sekund. Inga konton, recept, lager eller hushållssysslor ännu.

Planerade funktioner, inklusive kvittoskanning, finns i [kravdokumentet](KRAV.md).

## Kör lokalt

Kräver Node.js 24 eller senare. Kör `npm ci` för att installera databasdrivrutinen.

1. Kopiera `.env.example` till `.env`.
2. Ange din API-nyckel som `OPENAI_API_KEY` i `.env`. Nyckeln stannar på servern. Ett ChatGPT-abonnemang inkluderar inte automatiskt API-användning; API-kontot behöver tillgängligt saldo.
3. Kör `npm start`.
4. Öppna http://localhost:3000.

Listan fungerar utan nyckel. AI och röst kräver en nyckel och nätanslutning. Mobilens mikrofon kräver HTTPS vid åtkomst över nätverket; localhost fungerar på datorn. Godkänn mikrofonåtkomst i webbläsaren. Ljud skickas till OpenAI vid avslutad inspelning och sparas inte av appen. Inspelningar begränsas till 30 sekunder.

## Prova

- Säg ”Lägg till mjölk, ägg och potatis”.
- Säg ”Jag har köpt mjölken”.
- Säg ”Ångra avbockningen av mjölk”.
- Lägg till med textfältet och ändra bockar manuellt.
- Tryck ”Chatta” bredvid ”Börja prata” för att skriva till AI:n.

Appen visar transkript och resultat. Bocka tillbaka manuellt vid feltolkning. Befintliga produkter matchas utan hänsyn till stora/små bokstäver.

## Chatta

- Knappen ”Chatta” har samma utseende som ”Börja prata” och öppnar ett fritextfält.
- Skriv exempelvis ”Lägg till två mjölk”, ”Vad återstår att köpa?” eller en följdfråga.
- AI:n ser den aktuella listan och kan både svara och utföra liständringar. Backend räknar kategorier, varurader och antal åt AI:n. Frågor ändrar inte listan om ingen ändring begärs.
- Svar visas i en konversation. Enter skickar och Shift+Enter ger radbrytning.
- Konversationen bevaras när fältet stängs och öppnas. Den finns bara under det aktuella sidbesöket; den lagras inte som en gemensam chatt. De senaste tio meddelandena används som samtalskontext.
- AI-kopplingen använder samma servernyckel, modell och anropsgräns som röststyrningen.

## Kategorier och artikelkontroller

- Kategorierna i `public/categories.js` följer Elins butiksordning. Endast kategorier med artiklar visas. Även avbockade artiklar behåller platsen inom sin kategori.
- AI kategoriserar både röstinmatade och manuellt tillagda nya varor. Nuvarande varor utan kategori kategoriseras i bakgrunden vid serverstart.
- Varje artikel visas på en kompakt rad med namn, kategoriväljare, antal 1–999 och borttagning. Antal kan ändras direkt eller med minus/plus; på de smalaste skärmarna används direkt inmatning. Kategorirubrikerna är större och tydligare.
- Inmatningsfältet för nya varor har ingen separat antalväljare. Nya varor får antal ett, som kan ändras på artikelraden eller via röst.
- Kategoribyten och antal sparas direkt. Manuellt valda kategorier bevaras vid senare AI-kategorisering och när samma vara läggs till igen.
- Exempel: ”Lägg till två paket mjölk”, ”Ändra antalet mjölk till tre” och ”Ta bort mjölken”. ”Jag har köpt mjölken” bockar av varan och tar inte bort den.
- Antal avser artiklar/förpackningar. Vikt eller volym kan finnas i namnet och räknas inte om till antal.
- Om AI-kategorisering inte är tillgänglig sparas varan ändå under ”Välj kategori”, där kategori kan väljas manuellt. Kontroller för antal, avbockning, kategoribyte och borttagning kräver inga AI-anrop.
- Äldre varor får antal ett. Utökningen använder befintlig JSON-lagring och kräver ingen SQL-migrering.

## Data och drift

Lokalt utan `DATABASE_URL` sparas listan atomiskt i `data/list.json`. På Render krävs `DATABASE_URL` till en separat Neon-databas. Databasschemat finns i `schema.sql`. Render behöver ingen beständig disk. Samtidiga ändringar skyddas med versionskontroll i databasen.

Render-konfiguration för direkt skapad tjänst:

- Repo: `https://github.com/AntonafSegerstad/Home-Helper`
- Branch: `main`
- Runtime: Node, `NODE_VERSION=24.19.0`
- Region: Frankfurt
- Plan: Free
- Build: `npm ci && npm test`
- Start: `npm start`
- Health check: `/healthz`
- Hemligheter: `DATABASE_URL`, `OPENAI_API_KEY` (bara servermiljö)

Det nya Neon-projektet HomeHelper är `orange-mode-28651805`, databas `homehelper`. Godnatt och dess databas används inte av appen.

GitHub Actions kör tester och syntaxkontroller vid push. Appen är live på https://homehelper-i7to.onrender.com. Deployment, databas och OpenAI är verifierade. Rösttillägg och avbockning är testade med syntetiska ljudklipp; svenskt tal från mobilmikrofon återstår att verifiera. Render-verktyget saknar stöd för att skapa projektmappar och kopiera befintliga serverhemligheter; dessa moment behöver Render-panelen eller en separat API-anslutning.

Appen är avsiktligt öppen: alla som når servern kan läsa och ändra listan samt använda AI-kopplingen. Det finns ett enkelt globalt tak på 60 AI-anrop/timme per process och endast ett samtidigt AI-anrop, inklusive kategorisering. Taket återställs vid omstart; sätt även en budget i OpenAI-projektet. Nyckeln exponeras aldrig till klienten.

Manifest och ikon finns för hemskärmsläge. Offlinefunktion, service worker och push ingår inte i första steget.

## Kontroll

`npm test` kör 29 tester för liständringar, AI-kontrakt, kategoriernas ordning, chatt och följdfrågor, DOM-kontroller och HTTP-API inklusive sparande efter serveromstart. AI-svaren i testsviten är simulerade. Ett riktigt rösttest kräver mikrofon och konfigurerad API-nyckel. `.npmrc` inkluderar testberoenden även när byggmiljön har NODE_ENV=production.
