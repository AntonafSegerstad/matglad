import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { interpret } from './list.js';
import { createStore } from './storage.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const store = await createStore();
const commit = actions => store.commit(actions);
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
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (req.method === 'GET' && url.pathname === '/healthz') { await store.read(); return json(res, 200, { ok: true, storage: store.kind, voiceEnabled: Boolean(process.env.OPENAI_API_KEY) }); }
    if (req.method === 'GET' && url.pathname === '/api/list') return json(res, 200, { items: await store.read(), voiceEnabled: Boolean(process.env.OPENAI_API_KEY) });
    if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
      // Browsers may only change data from this app's own origin.
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return json(res, 403, { error: 'Otillåtet ursprung.' });
      if (url.pathname === '/api/actions') {
        const { actions } = JSON.parse((await body(req, 20000)).toString());
        return json(res, 200, await commit(actions));
      }
      if (url.pathname === '/api/voice' || url.pathname === '/api/command') {
        const key = process.env.OPENAI_API_KEY;
        if (!key) return json(res, 503, { error: 'Lägg till OPENAI_API_KEY i serverns .env för att aktivera AI och röst.' });
        const now = Date.now();
        while (aiCalls.length && aiCalls[0] < now - 3600000) aiCalls.shift();
        if (aiBusy || aiCalls.length >= 60) return json(res, 429, { error: 'Vänta lite innan nästa AI-kommando.' });
        aiBusy = true; aiCalls.push(now);
        try {
          let text;
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
          } else { text = JSON.parse((await body(req, 10000)).toString()).text; }
          if (typeof text !== 'string' || !text.trim() || text.length > 4000) throw new Error('Kommandot är tomt eller för långt.');
          const actions = await interpret(text, await store.read(), key);
          return json(res, 200, { ...await commit(actions), transcript: text });
        } finally { aiBusy = false; }
      }
    }
    const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json'], '/icon.svg': ['icon.svg', 'image/svg+xml'] };
    const file = files[url.pathname];
    if (req.method !== 'GET' || !file) return json(res, 404, { error: 'Sidan finns inte.' });
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8` });
    res.end(await readFile(path.join(root, 'public', file[0])));
  } catch (error) {
    if (error.name === 'NeonDbError' || error.sourceError) return json(res, 503, { error: 'Databasen kunde inte nås. Försök igen.' });
    json(res, 400, { error: error.name === 'TimeoutError' ? 'Anropet tog för lång tid. Försök igen.' : error instanceof SyntaxError ? 'Kunde inte läsa kommandot.' : error.message });
  }
});
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log(`HomeHelper körs på port ${process.env.PORT || 3000}`));

process.on('SIGTERM', () => { server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 10000).unref(); });
