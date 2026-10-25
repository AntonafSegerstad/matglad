import { renderList } from './list-view.js';
const $ = id => document.getElementById(id);
let items = [], busy = false, recorder, stream, timer, chunks = [], starting = false;
function status(message, error = false) { $('status').textContent = message; $('status').className = error ? 'error' : ''; }
async function request(url, body, raw = false) {
  const response = await fetch(url, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': raw ? body.type : 'application/json' }, body: raw ? body : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Något gick fel.');
  return result;
}
function render() {
  renderList($('items'), items, action => mutate('/api/actions', { actions: [action] }), busy);
  $('count').textContent = `${items.filter(i => !i.checked).length} kvar`;
  $('empty').hidden = items.length > 0;
}
function lock(value) {
  busy = value;
  document.querySelectorAll('button,input,select').forEach(el => { el.disabled = value; });
  if (!value) render();
}
async function mutate(url, body, raw = false) {
  if (busy) return;
  const focusKey = document.activeElement?.dataset.focusKey;
  lock(true);
  try {
    const result = await request(url, body, raw); items = result.items; status(result.warning ? `${result.message} ${result.warning}` : result.message);
    if (result.transcript) { $('transcript').textContent = `Du sa: ”${result.transcript}”`; $('transcript').hidden = false; }
    return true;
  } catch (error) { status(error.message, true); return false; }
  finally {
    lock(false);
    if (focusKey) [...$('items').querySelectorAll('[data-focus-key]')].find(control => control.dataset.focusKey === focusKey)?.focus();
  }
}
$('add-form').addEventListener('submit', async event => {
  event.preventDefault(); const name = $('item').value.trim(); if (!name) return;
  if (await mutate('/api/actions', { actions: [{ type: 'add', name }] })) $('item').value = '';
});
$('command-form').addEventListener('submit', async event => {
  event.preventDefault(); const text = $('command').value.trim(); if (!text) return;
  status('Tolkar kommandot…');
  if (await mutate('/api/command', { text })) $('command').value = '';
});
function stop() { if (recorder?.state === 'recording') recorder.stop(); }
$('mic').addEventListener('click', async () => {
  if (recorder?.state === 'recording') { stop(); return; }
  if (starting || busy) return;
  if (!window.MediaRecorder || !navigator.mediaDevices?.getUserMedia) { status('Mikrofonen kräver HTTPS eller localhost och en webbläsare med inspelningsstöd. Du kan skriva istället.', true); return; }
  starting = true; $('mic').disabled = true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error('Din webbläsares ljudformat stöds inte. Prova att skriva istället.');
    recorder = new MediaRecorder(stream, { mimeType }); chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = async () => {
      clearTimeout(timer); stream?.getTracks().forEach(track => track.stop());
      $('mic').classList.remove('recording'); $('mic').textContent = '● Börja prata';
      const audio = new Blob(chunks, { type: mimeType }); chunks = [];
      if (audio.size === 0) { status('Inget ljud spelades in. Försök igen.', true); return; }
      status('Lyssnar och uppdaterar listan…'); await mutate('/api/voice', audio, true);
    };
    recorder.onerror = () => { stop(); stream?.getTracks().forEach(track => track.stop()); status('Inspelningen avbröts. Försök igen.', true); };
    recorder.start(); $('mic').classList.add('recording'); $('mic').textContent = '■ Klart, uppdatera listan';
    status('Prata nu. Tryck på knappen när du är klar.'); timer = setTimeout(stop, 30000);
  } catch (error) {
    stream?.getTracks().forEach(track => track.stop());
    status(error.name === 'NotAllowedError' ? 'Tillåt mikrofonen i webbläsaren eller skriv istället.' : error.message, true);
  } finally { starting = false; $('mic').disabled = false; }
});
function editingItem() {
  const active = document.activeElement;
  return $('items').contains(active) && (active?.tagName === 'SELECT' || (active?.tagName === 'INPUT' && active.type === 'number'));
}
async function refresh() {
  if (busy || starting || recorder?.state === 'recording' || editingItem()) return;
  try {
    const result = await request('/api/list');
    if (busy || starting || recorder?.state === 'recording' || editingItem()) return;
    if (JSON.stringify(items) !== JSON.stringify(result.items)) { items = result.items; render(); }
    if (!result.voiceEnabled && !$('status').textContent) status('Listan fungerar. Röst aktiveras när servern har en OpenAI API-nyckel.');
  } catch { status('Kan inte nå servern. Kontrollera anslutningen.', true); }
}
await refresh();
setInterval(refresh, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else refresh(); });
