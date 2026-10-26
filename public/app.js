import { renderList } from './list-view.js';
import { setupChat } from './chat.js';
import { renderFamilyButtons } from './families-view.js';
import { renderCategoryDashboard } from './dashboard.js';
import { groupItems } from './categories.js';
const $ = id => document.getElementById(id);
let items = [], busy = false, recorder, stream, timer, chunks = [], starting = false;
let currentFamily = null, selectedCategory = null;
function status(message, error = false) { $('status').textContent = message; $('status').className = error ? 'error' : ''; }
async function request(url, body, raw = false) {
  const scoped = url.startsWith('/api/') && url !== '/api/families';
  if (scoped && !currentFamily) throw new Error('Välj en familj först.');
  const target = scoped ? `${url}?familyId=${encodeURIComponent(currentFamily.id)}` : url;
  const response = await fetch(target, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': raw ? body.type : 'application/json' }, body: raw ? body : JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Något gick fel.');
  return result;
}
function render() {
  const groups = groupItems(items);
  let group = groups.find(group => (group.id ?? 'unassigned') === selectedCategory);
  if (selectedCategory !== null && !group) selectedCategory = null;
  const detail = selectedCategory !== null;
  $('category-grid').hidden = detail; $('items').hidden = !detail; $('category-back').hidden = !detail;
  $('list-card').classList.toggle('dashboard', !detail);
  renderCategoryDashboard($('category-grid'), items, id => { if (!busy) { selectedCategory = id; render(); } });
  const visibleItems = detail ? group.items : items;
  renderList($('items'), detail ? visibleItems : [], action => mutate('/api/actions', { actions: [action] }), busy);
  $('count').textContent = `${visibleItems.filter(i => !i.checked).length} kvar`;
  $('empty').hidden = items.length > 0;
}
$('category-back').addEventListener('click', () => { selectedCategory = null; render(); });

function familyStatus(message, error = false) { $('family-status').textContent = message; $('family-status').className = error ? 'error' : ''; }
async function loadFamilies() {
  familyStatus('Hämtar familjer…');
  try {
    const result = await request('/api/families');
    renderFamilyButtons($('family-buttons'), result.families, openFamily);
    familyStatus('');
  } catch (error) { familyStatus(error.message, true); }
}
async function openFamily(family) {
  if (busy || starting || recorder?.state === 'recording') return;
  lock(true); currentFamily = family; selectedCategory = null; items = [];
  familyStatus('Öppnar listan…');
  try {
    const result = await request('/api/list'); items = result.items;
    $('active-family').textContent = family.name;
    chat.reset(); status(''); $('transcript').hidden = true; $('item').value = '';
    $('family-screen').hidden = true; $('shopping-screen').hidden = false;
    familyStatus('');
  } catch (error) { currentFamily = null; familyStatus(error.message, true); }
  finally { lock(false); }
}
$('family-back').addEventListener('click', async () => {
  if (busy || starting || recorder?.state === 'recording') { status('Avsluta inspelningen innan du byter familj.'); return; }
  currentFamily = null; selectedCategory = null; items = []; chat.reset();
  $('shopping-screen').hidden = true; $('family-screen').hidden = false;
  await loadFamilies();
});
function showFamilyForm(show) {
  $('family-form').hidden = !show; $('add-family-toggle').setAttribute('aria-expanded', String(show));
  if (show) $('family-input').focus();
}
$('add-family-toggle').addEventListener('click', () => showFamilyForm($('family-form').hidden));
$('family-cancel').addEventListener('click', () => showFamilyForm(false));
$('family-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  const name = $('family-input').value.trim(); if (!name) return;
  let family;
  lock(true); familyStatus('Lägger till familjen…');
  try {
    const result = await request('/api/families', { name }); family = result.family;
    renderFamilyButtons($('family-buttons'), result.families, openFamily, true);
    $('family-input').value = ''; showFamilyForm(false); familyStatus('');
  } catch (error) { familyStatus(error.message, true); }
  finally { lock(false); }
  if (family) await openFamily(family);
});
function lock(value) {
  busy = value;
  document.querySelectorAll('button,input,select,textarea').forEach(el => { el.disabled = value; });
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
const chat = setupChat({
  document,
  async send(payload) {
    if (starting || recorder?.state === 'recording') throw new Error('Avsluta inspelningen innan du skickar ett meddelande.');
    if (busy) throw new Error('Vänta tills den pågående ändringen är klar.');
    lock(true); status('AI:n svarar…');
    try {
      const result = await request('/api/chat', payload);
      items = result.items; status(result.message || '');
      return result.reply;
    } finally { lock(false); }
  },
  onError: message => status(message, true)
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
    recorder.start(); $('mic').classList.add('recording'); $('mic').textContent = '■ Avsluta';
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
  const familyId = currentFamily?.id;
  if (!familyId || busy || starting || recorder?.state === 'recording' || editingItem()) return;
  try {
    const result = await request('/api/list');
    if (currentFamily?.id !== familyId || busy || starting || recorder?.state === 'recording' || editingItem()) return;
    if (JSON.stringify(items) !== JSON.stringify(result.items)) { items = result.items; render(); }
    if (!result.voiceEnabled && !$('status').textContent) status('Listan fungerar. Röst aktiveras när servern har en OpenAI API-nyckel.');
  } catch { status('Kan inte nå servern. Kontrollera anslutningen.', true); }
}
await loadFamilies();
setInterval(refresh, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else refresh(); });
