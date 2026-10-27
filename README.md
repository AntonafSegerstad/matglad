# Matglad – prototypen

En öppen gemensam inköpslista med en AI som hjälper med mat, recept och näring. Lägg till och bocka av med tryck eller röst via ditt OpenAI API-konto. Alla enheter som väljer samma familj delar den familjens lista; ändringar hämtas var femte sekund. Varje familj har också ett skafferi med varutyper som finns hemma eller är slut. Inga konton, sparade recept eller hushållssysslor ännu.

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

## Familjer och kategoriöversikt

- Startskärmen visar familjer som runda namngivna knappar och en knapp ”Lägg till familj”.
- Varje familj får en egen lista. Den ursprungliga listan finns under ”Vår familj”, med alla tidigare artiklar bevarade. Inga konton eller inloggningar krävs.
- Efter familjval visas bara kategorier med artiklar, som små runda knappar med symbol, text och rött antal, tre per rad. Det röda antalet räknar oplockade varurader, inte förpackningar: lamm och köttfärs blir 2. Vid avbockning minskar siffran, men varan ligger kvar. En kategori med endast avbockade varor visas med 0 tills varorna tas bort.
- Varje kategori har en egen varm pastellfärg, i en palett med smörgult, persika, puderrosa, salvia och mild turkos. Färgen följer kategorin även när andra kategorier visas eller döljs. Mörk text och symboler samt röda räknare behåller tydlig kontrast.
- Tryck på en kategori för att ersätta cirkeln med en varulista som växer nedåt ovanpå andra kategorier. Alla rader visas utan intern scroll. Bredden anpassas till den längsta varuraden, med skärmens bredd som gräns. Listor vid högerkanten flyttas åt vänster vid behov. Endast en kategori är öppen åt gången; nästa cirkel stänger den förra och krysset visar cirkeln igen.
- Varunamn, kategoribytesikon och radering ligger på samma rad. Längre namn kan radbrytas först när skärmens bredd annars skulle överskridas.
- ”Checka ut varor” längst ned flyttar alla avbockade artiklar till vald familjs skafferi. Omarkerade varor ligger kvar. Utcheckningen sker på serverns aktuella lista i ett atomiskt steg, utan AI-anrop.
- Familjenamnet och en ikon för familjbyte ligger på samma rad som Matglad-logotypen. Knappanelen har fast bildförhållande med höjdgräns och kan inte växa av AI-svar.
- Röst, chatt, antal, kategoribyten och borttagning gäller alltid den valda familjen. Chatten töms vid familjbyte.
- API: `GET/POST /api/families` listar/skapar familjer. List- och AI-anrop använder `?familyId=<id>`. Anrop utan familj-id går till den ursprungliga listan för kompatibilitet med tidigare klienter.

## Chatta

- Knappen ”Chatta” har samma utseende som ”Börja prata” och öppnar ett separat chattfönster ovanpå sidan. Textfält och Skicka finns bara där och flyttar inte kategoriöversikten. Stäng med krysset, Escape eller ett tryck utanför fönstret.
- Skriv exempelvis ”Lägg till två mjölk”, ”Vad återstår att köpa?” eller en följdfråga.
- AI:n ser den aktuella listan och kan både svara och utföra liständringar. Backend räknar kategorier, varurader och antal åt AI:n. Frågor ändrar inte listan om ingen ändring begärs.
- Svar visas i en konversation som rullas inom chattfönstret. Röstkommandon och deras kvittenser finns också i chatthistoriken; huvudskärmen visar bara en kort statusrad. Enter skickar och Shift+Enter ger radbrytning.
- Konversationen bevaras när fältet stängs och öppnas. Den finns bara under det aktuella sidbesöket; den lagras inte som en gemensam chatt. De senaste tio meddelandena används som samtalskontext.
- AI-kopplingen använder samma servernyckel, modell och anropsgräns som röststyrningen.

## Köksassistent och AI-instruktion

Den gemensamma instruktionen i `ai-instructions.js` används för chatt och transkriberat tal. AI:n hjälper med matvaror, ingredienser, recept, tillagning, ersättningar, näring och appens nuvarande funktioner. En rapport om lagad eller uppäten mat granskas separat: huvudingredienser markeras som behöver köpas och läggs i Att handla. Kryddor, olja och antagna tillbehör utelämnas. Svaren bekräftar bara sparade ändringar. Röstfrågans fullständiga svar sparas i det separata chattfönstret; huvudskärmens gröna panel behåller sin storlek.

Instruktionen är skriven för matglad med inspiration från communityns [Chef och Personal Chef i Awesome ChatGPT Prompts](https://github.com/amirtds/awesome-chatgpt-prompts#act-as-a-chef) av devisasari respektive giorgiop. Näringsdelen följer principen att ange mängd och skilja rå/tillagad mat samt uppskattningar från verifierade värden; se [Livsmedelsverkets beskrivning av Sök näringsinnehåll](https://www.livsmedelsverket.se/livsmedel-och-innehall/naringsamne/livsmedelsdatabasen/sok-naringsinnehall/). Appen har ingen ansluten näringsdatabas eller webbsökning och AI:n får inte påstå att ett värde har hämtats därifrån.

Standardmodell för chatt, listtolkning och kategorisering är `gpt-5-mini` (`OPENAI_COMMAND_MODEL`). Måltidsrapporter granskas separat med `OPENAI_MEAL_MODEL`, också `gpt-5-mini`. Modellen använder låg reasoning effort och timeout på 90 sekunder per AI-anrop. Tal transkriberas fortsatt med `gpt-4o-mini-transcribe` (`OPENAI_TRANSCRIBE_MODEL`).

## Skafferi och Ångra

Dörrikonen öppnar en enkel lista över familjens varutyper hemma, inklusive kyl, frys och kryddor. Börja med att inventera genom att prata, chatta eller skriva i skafferifältet. Mörk text betyder finns hemma; grå text betyder behöver köpas. Varje rad har en kundvagn för ”behöver köpas”, minus för att radera varan från både skafferi och inköpslista samt pilar för kategori. Bockikonen visas bara för gråa varor och markerar dem som tillgängliga igen. Ingen mängd eller negativ post visas. Manuella inventeringsrader får kategori via pilarna, utan separat AI-kategorisering.

Utcheckning fyller på skafferiet. Måltidsrapporter identifierar huvudingredienser och betydande basingredienser som läggs i Att handla och gråmarkeras. Separat maträttsbedömning skiljer huvudingredienser från kryddor, olja och tillbehör som inte nämndes. Grå betyder bara behöver köpas; ingen separat förbrukningsstatus eller mängd beräknas. En uttrycklig begäran att ta bort en vara raderar den från både skafferiet och Att handla. Varor som användaren säger finns kvar eller inte ska återköpas lämnas oförändrade.

”Ångra” via röst eller chatt återställer hela senaste ändringen av inköpslista och skafferi tillsammans. Tio steg sparas per familj. Skafferi, inköp och historik sparas atomiskt med versionskontroll. Återförsök med samma ändrings-id är idempotenta. AI-svar baserade på en gammal familjeversion avvisas med en uppmaning att försöka igen. Detta är varutypstatus, inte en beräkning av kvarvarande gram eller förpackningar.

## Kategorier och artikelkontroller

- Kategorierna i `public/categories.js` följer Elins butiksordning. Endast kategorier med artiklar visas. Även avbockade artiklar behåller platsen inom sin kategori.
- AI kategoriserar både röstinmatade och manuellt tillagda nya varor. Nuvarande varor utan kategori kategoriseras i bakgrunden vid serverstart.
- Varje artikel visas med avbockning och namn. Ikoner ger kategoribyte och borttagning. Antal och mängder stöds inte; äldre interna mängdfält bevaras men visas inte.
- Inmatningsfältet för nya varor har ingen separat antalväljare. Nya varor får antal ett, som kan ändras via röst eller chatt.
- Kategoribyten och antal sparas direkt. Manuellt valda kategorier bevaras vid senare AI-kategorisering och när samma vara läggs till igen.
- Exempel: ”Lägg till två paket mjölk”, ”Ändra antalet mjölk till tre” och ”Ta bort mjölken”. ”Jag har köpt mjölken” bockar av varan och tar inte bort den.
- AI-åtgärder måste ha quantity=null. Varje produkt läggs till som en varutyp, utan mängd.
- Om AI-kategorisering inte är tillgänglig sparas varan ändå under ”Välj kategori”, där kategori kan väljas manuellt. Kontroller för avbockning, kategoribyte och borttagning kräver inga AI-anrop.
- Äldre varor får antal ett. Utökningen använder befintlig JSON-lagring och kräver ingen SQL-migrering.

## Data och drift

Lokalt utan `DATABASE_URL` sparas familjens inköp, skafferi och ångrahistorik atomiskt i `data/household-<familje-id>.json`. Äldre `data/list.json` läses vid första starten och lämnas kvar. På Render krävs `DATABASE_URL` till en separat Neon-databas. Det kompletta databasschemat finns i `schema.sql`. För en befintlig databas körs de tilläggande migreringarna `migrations/002_families.sql` och `migrations/003_pantry.sql` före deployment. Den ursprungliga listan ligger kvar i `shopping_list`; övriga familjer använder `families` och `family_lists`. Render behöver ingen beständig disk. Samtidiga ändringar skyddas med versionskontroll i databasen.

Render-konfiguration för direkt skapad tjänst:

- Repo: `https://github.com/AntonafSegerstad/matglad`
- Branch: `main`
- Runtime: Node, `NODE_VERSION=24.19.0`
- Region: Frankfurt
- Plan: Free
- Build: `npm ci && npm test`
- Start: `npm start`
- Health check: `/healthz`
- Hemligheter: `DATABASE_URL`, `OPENAI_API_KEY` (bara servermiljö)

Neon-projektet matglad är `orange-mode-28651805`. Databasens interna namn `homehelper` och användaren `homehelper_owner` behålls enligt användarens önskemål. Godnatt och dess databas används inte av appen.

GitHub Actions kör tester och syntaxkontroller vid push. Appen är live på https://matglad.onrender.com. Deployment, databas och OpenAI är verifierade. Rösttillägg och avbockning är testade med syntetiska ljudklipp; svenskt tal från mobilmikrofon återstår att verifiera. Render-verktyget saknar stöd för att skapa projektmappar och kopiera befintliga serverhemligheter; dessa moment behöver Render-panelen eller en separat API-anslutning.

Appen är avsiktligt öppen: alla som når servern kan läsa och ändra listan samt använda AI-kopplingen. Det finns ett enkelt globalt tak på 60 AI-anrop/timme per process och endast ett samtidigt AI-anrop, inklusive kategorisering. Taket återställs vid omstart; sätt även en budget i OpenAI-projektet. Nyckeln exponeras aldrig till klienten.

Manifest och ikon finns för hemskärmsläge. Offlinefunktion, service worker och push ingår inte i första steget.

## Kontroll

`npm test` kör regressionstester för liständringar, AI-kontrakt, kategoriernas ordning, chatt och följdfrågor, familjseparering, kategorikort, DOM-kontroller och HTTP-API inklusive sparande efter serveromstart. Testerna verifierar också gemensam AI-hantering för röst/text, inventering, förbrukning, gråa poster, återköp, kategoribyte, Ångra, familjseparering och sparande efter omstart. AI-svaren i testsviten är simulerade. Ett riktigt rösttest kräver mikrofon och konfigurerad API-nyckel. `.npmrc` inkluderar testberoenden även när byggmiljön har NODE_ENV=production.

## Grafisk profil

Matglad använder logotyperna i `design-assets/matglad-logo/`. Toppfältet är mörkblått (#1E2A47), sidan äggvit (#F8F2E7), med rödorange (#D9482B), grönt (#3E9B5B) och gula accenter (#F2B632) i grafiken. Ingen gul logotyptext eller lägesväxling används. Bannerordmärket har vita Mat-bokstäver och rödorange glad från originalets vektorgrafik.

Rubriker och knappar använder det lokalt levererade typsnittet Fredoka, vars former ligger nära logotypen. Typsnittsnamnet finns inte i originalfilerna och identiteten är därför inte bekräftad. Källa: https://github.com/google/fonts/tree/main/ofl/fredoka. Licensen ligger i `public/fonts/OFL-Fredoka.txt`. Appen behöver ingen extern typsnittstjänst.

