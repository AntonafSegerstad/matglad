# Deploymentstatus

## Förberett
- Appnamn HomeHelper, önskat repo AntonafSegerstad/Home-Helper.
- Bekräftad Render-workspace My Workspace: tea-dajv1feq1p3s739let4g.
- Ny separat Neon-databas HomeHelper i Frankfurt: orange-mode-28651805, databas homehelper.
- Databasschema versionshanteras i schema.sql.
- Hälsokontroll /healthz, CI och beständig lagring klara i koden.

## Blockerat
- GitHubs anslutna integration nekar repo-skapande med HTTP 403 Resource not accessible by integration. Både gh repo create och REST POST /user/repos har prövats. Användaren har godkänt skapandet; hindret är integrationens behörighet.
- Ingen ansluten webbläsarstyrning är tillgänglig.
- Render MCP kan skapa tjänst men inte projekt eller läsa/kopiera Godnatts OPENAI_API_KEY. Ändra inte Godnatt för att lösa detta.

## Fortsätt
1. Skapa tomt Home-Helper-repo eller tillgängliggör GitHub-behörighet för skapande.
2. Pusha main från detta lokala repo.
3. Skapa ny Node-tjänst i den bekräftade workspacen enligt README. Hämta HomeHelpers DATABASE_URL via Neon och överför direkt till just den nya tjänsten utan att skriva ut den.
4. Sätt OPENAI_API_KEY i den nya tjänstens servermiljö; nyckeln får inte hamna i chatten eller repot.
5. Skapa separat Render-projekt HomeHelper och placera endast den nya tjänsten där via Dashboard/API.
6. Övervaka deployment till live, verifiera API, liständringar och beständighet efter redeploy. Testa riktigt ljud med mikrofon.

Inga befintliga GitHub-repon eller Render-tjänster har ändrats.
