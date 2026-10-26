# Deploymentstatus – HomeHelper

Verifierad 2026-10-26.

## Publicerat
- Privat repo: https://github.com/AntonafSegerstad/Home-Helper
- App: https://homehelper-i7to.onrender.com
- Render: https://dashboard.render.com/web/srv-dbf4etoae00c73eo92d0
- Bekräftad workspace My Workspace: tea-dajv1feq1p3s739let4g.
- Ny tjänst srv-dbf4etoae00c73eo92d0, Free, Node 24.19.0, Frankfurt.
- Kodcommit 6221ff09f518bbe7e4e459d9150f645f20158287.
- Deploy dep-dbfmkjjbc2fs739e1mvg: live.
- GitHub CI: https://github.com/AntonafSegerstad/Home-Helper/actions/runs/40344524696 (success, 37 tester).
- Auto-deploy är aktiv vid commit. Byggkommandot kör npm ci och npm test före start.

## Databas
- Nytt separat Neon-projekt HomeHelper: orange-mode-28651805, Frankfurt.
- Databas homehelper, roll homehelper_owner, PostgreSQL 17.
- Schema versionshanteras i schema.sql; shopping_list är initierad.
- DATABASE_URL har överförts direkt från Neon till endast den nya Render-tjänsten utan att skrivas till repo eller arbetsfiler.
- /healthz svarar 200 med ok=true, storage=postgres.

## Verifierat
- Startsida och samtliga frontendfiler svarar över HTTPS.
- Tillägg och avbockning verifierade via publikt API med separat återläsning.
- En avbockad ”Testvara – HomeHelper” ligger kvar som tydligt märkt testdata.
- OPENAI_API_KEY är konfigurerad endast i HomeHelpers servermiljö efter användarens uttryckliga instruktion.
- Deploy dep-dbf4fr59fdbs738pui70 är live med voiceEnabled=true.
- Den tidigare testvaran fanns kvar efter redeploy.
- Svenska riktiga AI-textkommandon återställde och bockade av testvaran.
- Syntetiskt engelskt tal via /api/voice transkriberades av OpenAI och lade till mjölk och ägg. Ett andra ljudklipp bockade av båda.
- Test med engelsk uppläsning av svenska ord gav felaktigt transkript och ingen ändring. Svenskt tal från mobilmikrofon återstår att verifiera.
- Testvaran, mjölk och ägg finns kvar avbockade efter kontrollerna. Inga nycklar har sparats i koden eller dokumentationen.

## Kategorier, antal och borttagning
- Alla 30 kategorier i Elins överenskomna butiksordning är inbyggda. Endast kategorier som innehåller varor visas.
- Avbockade varor behåller sin plats inom kategorin. Byte av kategori flyttar varan till rätt avdelning.
- AI kategoriserar nya manuella varor och röstkommandon; befintliga varor utan kategori kompletteras i bakgrunden. Manuella kategorival skrivs inte över.
- Varje artikel har kategoriväljare, antal 1–999 med direkt inmatning och minus/plus samt borttagning.
- Äldre artiklar får antal ett och behåller id, namn och avbockning. Ingen SQL-migrering behövdes.
- 21 tester omfattar listlogik, AI-kontrakt, butiksordning, DOM-kontroller och HTTP inklusive omstart.
- Riktig AI i produktion verifierade broccoli → Grönsaker, fryst broccoli → Fryst, ägg → Chark och ägg och diskmaskinssalt → Städ, tvätt och papper.
- Riktigt svenskt AI-kommando ändrade antal och kategori på en tillfällig testartikel. Manuell ändring, stabil avbockningsordning och borttagning verifierades med nya läsanrop.
- Alla tillfälliga testartiklar från denna kontroll togs bort genom appens API. Tidigare artiklar bevarades.

## Kompakt artikellayout
- Varunamn, antal, kategoriväljare och borttagning ligger på samma rad. Långa namn kan radbrytas.
- Kategorirubrikerna är större (18 px), mörkare och fetare.
- Antalväljaren vid fältet för nya varor är borttagen. Antal ändras per vara eller via röst.
- På de smalaste skärmarna visas direkt antalfält utan minus/plus för att behålla plats för varunamnet.
- Alla 21 tester passerar. Publika HTML-, JS- och CSS-filer samt hälsokontrollen är verifierade efter deployment. Inga produktionsartiklar ändrades vid denna layoutkontroll.

## Familjväljare, kategoriöversikt och chatt
- Startskärmen har runda familjeknappar och ”Lägg till familj”. Den ursprungliga listan ligger under ”Vår familj” med samma artiklar och avbockningar.
- Varje familj har separat lagring. Röst, chatt och samtliga liständringar använder den valda familjens id. Chattens historik töms när familj byts.
- Kategorier visas som kort med SVG-symbol, namn och röd siffra. Siffran räknar varurader inklusive avbockade, inte förpackningsantal. Tomma kategorier döljs. Ett tryck öppnar kategorins artiklar.
- Chatta är en knapp bredvid Börja prata med samma utseende. Den visar fritextfält och konversation. Listfrågor använder totalsiffror beräknade av backend.
- Migrering migrations/002_families.sql är tillämpad. Den skapar endast nya tabeller och familjemetadata; den ursprungliga shopping_list ändras inte. Ursprungliga artiklars datahash och version var oförändrade efter både migrering och deployment.
- Testgren br-bold-wave-b9sy3o3x i samma Neon-projekt användes för migrering och riktiga lagringsprov. Grenen upphör automatiskt 2026-10-27 14:00 UTC. Produktionsgrenen är fortsatt br-wispy-dust-b9s4tm6l.
- Riktiga databasprov verifierade transaktioner, nya familjer, listseparering, antal, beständighet och avvisade dubbelnamn. Testfamiljerna finns endast på testgrenen.
- 34 tester är godkända lokalt, i GitHub CI och Render-bygget, inklusive hela familjval/kategoriöversiktsflödet med DOM och API.
- Publik HTTPS-kontroll verifierade familjer, samma ursprungliga lista via explicit familje-id och äldre API, korrekta symboler och röda siffror samt familjens riktiga AI-chatt. Inga nya testfamiljer eller testvaror lämnades i produktion. Inga runtime-fel hittades efter deployment.

## Kompakt huvudskärm och kortväxling
- Familjenamnet ligger i logoraden, med en ikon med person och cirkelpilar för familjbyte.
- Den gröna panelen har bildförhållande 7:2 och höjdgräns 92–124 px. Status ligger på en enda avkortad rad. Inget chattinnehåll eller textfält finns i panelen.
- Chatta öppnar ett separat fast positionerat fönster med intern rullning, stängknapp, Escape och klick utanför. Huvudskärmens kategorier flyttas inte av samtalet. Fönstret kan stängas även under pågående AI-anrop, och ett senare svar återöppnar det inte.
- Kategorivaror öppnas lokalt under det valda kortparet. Alla övriga kort ligger kvar; nästa kategori stänger föregående. Varulistan rullas inom kortområdet. Klickad kortposition och fokus bevaras vid byte.
- 37 tester passerar. Publika frontendfiler jämfördes med repot och familjval, kortväxling och separat chatt provades med befintliga data i en DOM-kontroll. Ingen fysisk skärmgeometri eller telefonmikrofon testades i denna kontroll. Inga produktionsartiklar ändrades. Inga runtime-fel hittades efter deployment.

## Kvar
1. Verifiera riktigt svenskt tal via mobilens mikrofon.
2. Nyckeln är konfigurerad och AI-kopplingen verifierad; ingen ytterligare nyckelinmatning behövs.
3. Skapa separat Render-projekt HomeHelper och flytta endast den nya tjänsten dit via Dashboard/API. Render MCP saknar stöd för detta. Tjänsten finns tills vidare fristående i workspacen.
4. /healthz finns i appen. Render-skapandeverktyget kan inte konfigurera healthCheckPath, så plattformen använder sin normala TCP-kontroll tills HTTP-sökvägen sätts i panelen.

## Skyddade resurser
Inga befintliga GitHub-repon, Render-tjänster eller Neon-databaser har ändrats. Godnatt, invoice-simulator och VASS-todo-list är orörda.
