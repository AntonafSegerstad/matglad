# Driftsättning – matglad

Uppdaterad 2026-10-27.

- Repo: https://github.com/AntonafSegerstad/matglad
- Branch: main. Koden och historiken är överförda med användarens uttryckliga godkännande att det nya repot är offentligt.
- Ny appadress: https://matglad.onrender.com
- Ny Render-tjänst: srv-dbgd1gkipgvc73f74spg, namn matglad, Free, Node 24.19.0, Frankfurt.
- Bygg: npm ci && npm test. Start: npm start.
- 51 lokala tester är godkända. AI-svaren i testerna är simulerade.
- Databasprojekt: matglad (orange-mode-28651805).
- Databasens interna namn homehelper och rollen homehelper_owner behålls på användarens uttryckliga instruktion. Inga databasbehörigheter ändras.
- Befintliga inköpslistor, skafferi och familjer används via samma databas. Inga appdata kopieras till ett nytt lager.
- DATABASE_URL och OPENAI_API_KEY hålls i Render och skrivs inte i repot.
- Den tidigare Render-tjänsten heter matglad-previous och är pausad efter verifierad flytt.
- Det gamla repot är bevarat. Alla nya kodändringar görs i matglad.

## Slutkontroll

- Den nya tjänsten har status live. /healthz svarar med ok=true, storage=postgres och voiceEnabled=true.
- Familjen Anton och dess sparade inköpslista och skafferi är återlästa via den nya adressen.
- Den oanvända rollen matglad_owner som skapades under förberedelsen är borttagen med användarens uttryckliga godkännande.
- Lokal källkod: C:/Users/Anton af Segerstad/Documents/ChatGPT/matglad.
