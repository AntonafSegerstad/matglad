# HomeHelper – första prototypen

En öppen gemensam inköpslista. Lägg till och bocka av med tryck eller röst via ditt OpenAI API-konto. Alla enheter mot samma server delar listan; ändringar hämtas var femte sekund. Inga konton, recept, lager eller hushållssysslor ännu.

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
- Prova samma kommandon i text under ”Vill du skriva ett röstkommando?”.

Appen visar transkript och resultat. Bocka tillbaka manuellt vid feltolkning. Befintliga produkter matchas utan hänsyn till stora/små bokstäver. Detta är ingen fullständig produktkatalog: namn som ”sex ägg” och ”ägg” kan ännu bli separata poster.

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

GitHub Actions kör tester och syntaxkontroller vid push. Ingen deployment är utförd ännu. Render-verktyget saknar stöd för att skapa projektmappar och kopiera befintliga serverhemligheter; dessa moment behöver Render-panelen eller en separat API-anslutning.

Appen är avsiktligt öppen: alla som når servern kan läsa och ändra listan samt använda AI-kopplingen. Det finns ett enkelt globalt tak på 60 AI-kommandon/timme per process och endast ett samtidigt AI-kommando. Taket återställs vid omstart; sätt även en budget i OpenAI-projektet. Nyckeln exponeras aldrig till klienten.

Manifest och ikon finns för hemskärmsläge. Offlinefunktion, service worker och push ingår inte i första steget.

## Kontroll

`npm test` testar liständringar, felhantering och AI-kontrakt med simulerade svar. Ett riktigt rösttest kräver mikrofon och konfigurerad API-nyckel.
