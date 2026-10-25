# Deploymentstatus – HomeHelper

Verifierad 2026-10-25.

## Publicerat
- Privat repo: https://github.com/AntonafSegerstad/Home-Helper
- App: https://homehelper-i7to.onrender.com
- Render: https://dashboard.render.com/web/srv-dbf4etoae00c73eo92d0
- Bekräftad workspace My Workspace: tea-dajv1feq1p3s739let4g.
- Ny tjänst srv-dbf4etoae00c73eo92d0, Free, Node 24.19.0, Frankfurt.
- Kodcommit 7eaa9e6b65c78a09d9bcbd22a49d6506656e0111.
- Deploy dep-dbf4eu8ae00c73eo9580: live.
- GitHub CI: https://github.com/AntonafSegerstad/Home-Helper/actions/runs/40220436120 (success, fem tester).
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
- OpenAI saknas: voiceEnabled=false. Inga riktiga AI-anrop har utförts.

## Kvar
1. Användaren sätter samma OpenAI API-nyckel som Godnatt som OPENAI_API_KEY i just HomeHelpers servermiljö: https://dashboard.render.com/web/srv-dbf4etoae00c73eo92d0/env. Skicka inte nyckeln i chatten eller repot. Välj Save, rebuild, and deploy.
2. Övervaka den nya deploymenten till live och verifiera att testvaran finns kvar efter redeploy. Testa sedan textkommando och riktigt ljud med mikrofon.
3. Skapa separat Render-projekt HomeHelper och flytta endast den nya tjänsten dit via Dashboard/API. Render MCP saknar stöd för detta. Tjänsten finns tills vidare fristående i workspacen.
4. /healthz finns i appen. Render-skapandeverktyget kan inte konfigurera healthCheckPath, så plattformen använder sin normala TCP-kontroll tills HTTP-sökvägen sätts i panelen.

## Skyddade resurser
Inga befintliga GitHub-repon, Render-tjänster eller Neon-databaser har ändrats. Godnatt, invoice-simulator och VASS-todo-list är orörda.
