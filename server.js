import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyActions, classifyProducts, categorizeNewActions, chatWithList, validateChatInput } from './list.js';
import { isCategory } from './public/categories.js';
import { createStore } from './storage.js';
import { DEFAULT_FAMILY_ID, validateFamilyId } from './families.js';
import { PANTRY_ACTIONS } from './pantry.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const store = await createStore();
const commit = (actions, familyId, options) => store.commit(actions, familyId, options);
async function readPublic(familyId) {
  const state = await store.readState(familyId);
  return { items: state.items, pantry: state.pantry, undoId: state.history.at(-1)?.id ?? null };
}
async function answerWithList(text, familyId, key, history = [], requestId) {
  const state = await store.readState(familyId);
  const answer = await chatWithList(text, state.items, key, history, fetch, state.pantry);
  if (!answer.actions.length) return { ...await readPublic(familyId), reply: answer.reply, message: '' };
  const result = await commit(answer.actions, familyId, { requestId, expectedVersion: state.version, undoId: state.history.at(-1)?.id });
  // Only the backend receipt describes applied changes, including stale/missing items.
  return { ...result, reply: [answer.reply, result.message].filter(Boolean).join('\n\n') };
}
async function body(req, max) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw new Error('Inspelningen eller texten är för stor. Prova en kortare.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
const json = (res, code, value) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
let aiBusy = false;
const aiCalls = [];
async function runAI(task) {
  const now = Date.now();
  while (aiCalls.length && aiCalls[0] < now - 3600000) aiCalls.shift();
  if (aiBusy || aiCalls.length >= 60) {
    const error = new Error('Vänta lite innan nästa AI-kommando.');
    error.status = 429;
    throw error;
  }
  aiBusy = true;
  aiCalls.push(now);
  try { return await task(); } finally { aiBusy = false; }
}

async function categorizeExisting() {
  if (!process.env.OPENAI_API_KEY) return;
  for (const family of await store.listFamilies()) {
    const uncategorized = (await store.read(family.id)).filter(item => !isCategory(item.category));
    for (let offset = 0; offset < uncategorized.length; offset += 50) {
      const batch = uncategorized.slice(offset, offset + 50);
      const categories = await runAI(() => classifyProducts(batch.map(item => item.name), process.env.OPENAI_API_KEY));
      const actions = batch.flatMap((item, index) => isCategory(categories[index]) ? [{ type: 'categorize', id: item.id, name: item.name, category: categories[index] }] : []);
      if (actions.length) await commit(actions, family.id);
    }
  }
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/healthz') { await store.read(); return json(res, 200, { ok: true, storage: store.kind, voiceEnabled: Boolean(process.env.OPENAI_API_KEY) }); }
    if (req.method === 'GET' && url.pathname === '/api/families') return json(res, 200, { families: await store.listFamilies() });
    const familyId = validateFamilyId(url.searchParams.get('familyId') ?? DEFAULT_FAMILY_ID);
    if (req.method === 'GET' && url.pathname === '/api/list') return json(res, 200, { ...await readPublic(familyId), voiceEnabled: Boolean(process.env.OPENAI_API_KEY) });
    if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
      // Browsers may only change data from this app's own origin.
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: 'Otillåtet ursprung.' });
      if (url.pathname === '/api/families') {
        const { name } = JSON.parse((await body(req, 2000)).toString());
        const family = await store.addFamily(name);
        return json(res, 201, { family, families: await store.listFamilies() });
      }
      if (url.pathname === '/api/checkout') {
        const payload = JSON.parse((await body(req, 1000)).toString());
        return json(res, 200, await commit([{ type: 'checkout' }], familyId, { requestId: payload.requestId }));
      }
      if (url.pathname === '/api/undo') {
        const payload = JSON.parse((await body(req, 1000)).toString());
        if (typeof payload.undoId !== 'string' || !payload.undoId) throw new Error('Hämta aktuell ändring innan du ångrar.');
        return json(res, 200, await commit([{ type: 'undo' }], familyId, { requestId: payload.requestId, undoId: payload.undoId }));
      }
      if (url.pathname === '/api/pantry') {
        const payload = JSON.parse((await body(req, 30000)).toString());
        if (!Array.isArray(payload.actions) || !payload.actions.every(action => PANTRY_ACTIONS.includes(action?.type))) throw new Error('Ogiltig skafferiändring.');
        return json(res, 200, await commit(payload.actions, familyId, { requestId: payload.requestId }));
      }
      if (url.pathname === '/api/actions') {
        let { actions, requestId } = JSON.parse((await body(req, 20000)).toString());
        const current = await store.read(familyId);
        applyActions(current, actions);
        let warning;
        if (process.env.OPENAI_API_KEY) {
          try {
            actions = await categorizeNewActions(actions, current, names => runAI(() => classifyProducts(names, process.env.OPENAI_API_KEY)));
          } catch {
            // A failed classification must not lose the user's shopping items.
            warning = 'Varan är sparad. Välj kategori på raden om den saknas.';
          }
        }
        return json(res, 200, { ...await commit(actions, familyId, { requestId }), ...(warning ? { warning } : {}) });
      }
      if (url.pathname === '/api/chat') {
        const key = process.env.OPENAI_API_KEY;
        if (!key) return json(res, 503, { error: 'AI-chatten är inte tillgänglig just nu.' });
        const payload = JSON.parse((await body(req, 60000)).toString());
        const input = validateChatInput(payload.text, payload.history);
        return await runAI(async () => json(res, 200, await answerWithList(input.text, familyId, key, input.history, payload.requestId)));
      }
      if (url.pathname === '/api/voice' || url.pathname === '/api/command') {
        const key = process.env.OPENAI_API_KEY;
        if (!key) return json(res, 503, { error: 'Lägg till OPENAI_API_KEY i serverns .env för att aktivera AI och röst.' });
        return await runAI(async () => {
          let text, requestId;
          if (url.pathname === '/api/voice') {
            const mime = (req.headers['content-type'] || '').split(';')[0];
            if (!['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'].includes(mime)) throw new Error('Ljudformatet stöds inte. Prova att skriva kommandot.');
            const audio = await body(req, 8 * 1024 * 1024);
            if (!audio.length) throw new Error('Inspelningen var tom.');
            const form = new FormData();
            form.append('file', new Blob([audio], { type: mime }), `recording.${{ 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/wav': 'wav' }[mime]}`);
            form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe');
            form.append('language', 'sv');
            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(45000) });
            if (!response.ok) throw new Error('OpenAI kunde inte transkribera ljudet. Kontrollera API-nyckel, saldo och anslutning.');
            text = (await response.json()).text;
          } else { const payload = JSON.parse((await body(req, 10000)).toString()); text = payload.text; requestId = payload.requestId; }
          if (typeof text !== 'string' || !text.trim() || text.length > 4000) throw new Error('Kommandot är tomt eller för långt.');
          const result = await answerWithList(text, familyId, key, [], requestId ?? req.headers['x-request-id']);
          return json(res, 200, { ...result, message: result.reply, transcript: text });
        });
      }
    }
    const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/pantry-view.js': ['pantry-view.js', 'text/javascript'], '/product-name.js': ['product-name.js', 'text/javascript'], '/chat.js': ['chat.js', 'text/javascript'], '/dashboard.js': ['dashboard.js', 'text/javascript'], '/families-view.js': ['families-view.js', 'text/javascript'], '/categories.js': ['categories.js', 'text/javascript'], '/list-view.js': ['list-view.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'], '/icon.svg': ['icon.svg', 'image/svg+xml'] };
    const file = files[url.pathname];
    if (req.method !== 'GET' || !file) return json(res, 404, { error: 'Sidan finns inte.' });
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8` });
    res.end(await readFile(path.join(root, 'public', file[0])));
  } catch (error) {
    if (error.name === 'NeonDbError' || error.sourceError) return json(res, 503, { error: 'Databasen kunde inte nås. Försök igen.' });
    json(res, error.status || 400, { error: error.name === 'TimeoutError' ? 'Anropet tog för lång tid. Försök igen.' : error instanceof SyntaxError ? 'Kunde inte läsa kommandot.' : error.message });
  }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => {
  console.log(`HomeHelper körs på port ${server.address().port}`);
  // Upgrade older lists asynchronously, keeping the app available if AI is down.
  categorizeExisting().catch(() => console.warn('Automatisk kategorisering kunde inte slutföras. Varorna finns kvar och kan kategoriseras manuellt.'));
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 10000).unref(); });
