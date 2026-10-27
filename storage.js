import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { applyHousehold, normalizeItems } from './list.js';
import { DEFAULT_FAMILY_ID, DEFAULT_FAMILY_NAME, validateFamilyId, familyName, familyNotFound, duplicateFamily } from './families.js';

const emptyState = items => ({ items: normalizeItems(items ?? []), pantry: [], history: [], requests: [], version: 0 });
function decode(row) {
  const saved = row.pantry_state ?? {};
  return { items: normalizeItems(row.items), pantry: saved.entries ?? [], history: saved.history ?? [], requests: saved.requests ?? [], version: row.version };
}
function publicState(state) {
  return { items: state.items, pantry: state.pantry, undoId: state.history.at(-1)?.id ?? null };
}
function update(current, actions, { requestId, undoId, expectedVersion } = {}) {
  if (requestId != null && (typeof requestId !== 'string' || !requestId || requestId.length > 100)) throw new Error('Ogiltigt ändrings-id.');
  if (requestId && current.requests.includes(requestId)) return { state: current, result: { ...publicState(current), message: 'Ändringen är redan utförd.' }, changed: false };
  if (expectedVersion != null && String(expectedVersion) !== String(current.version)) throw Object.assign(new Error('Listan ändrades medan AI:n svarade. Försök igen.'), { status: 409 });
  let state, result;
  if (Array.isArray(actions) && actions.some(action => action?.type === 'undo')) {
    if (actions.length !== 1) throw new Error('Ångra ska göras separat.');
    const previous = current.history.at(-1);
    if (undoId != null && previous?.id !== undoId) throw Object.assign(new Error('En ny ändring har gjorts. Kontrollera listan innan du ångrar.'), { status: 409 });
    state = previous ? { ...current, items: previous.items, pantry: previous.pantry, history: current.history.slice(0, -1) } : current;
    result = { message: previous ? 'Ångrade senaste ändringen.' : 'Det finns ingen ändring att ångra.' };
  } else {
    result = applyHousehold(current, actions);
    const changed = JSON.stringify([result.items, result.pantry]) !== JSON.stringify([current.items, current.pantry]);
    const systemOnly = actions.length > 0 && actions.every(action => action.type === 'categorize');
    state = { ...current, items: result.items, pantry: result.pantry,
      history: changed && !systemOnly ? [...current.history, { id: randomUUID(), items: current.items, pantry: current.pantry }].slice(-10) : current.history };
  }
  state = { ...state, requests: requestId ? [...current.requests, requestId].slice(-50) : current.requests };
  return { state, result: { ...result, ...publicState(state) }, changed: JSON.stringify(state) !== JSON.stringify(current) };
}

export async function createStore() {
  if (process.env.DATABASE_URL) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    const listFamilies = () => sql`SELECT id, name FROM families ORDER BY created_at, id`;
    const load = async (familyId = DEFAULT_FAMILY_ID) => {
      const id = validateFamilyId(familyId);
      const rows = id === DEFAULT_FAMILY_ID
        ? await sql`SELECT items, pantry_state, version FROM shopping_list WHERE id = 1`
        : await sql`SELECT items, pantry_state, version FROM family_lists WHERE family_id = ${id}::uuid`;
      if (!rows[0]) throw familyNotFound();
      return decode(rows[0]);
    };
    await listFamilies(); await load();
    return {
      kind: 'postgres', listFamilies,
      async addFamily(value) {
        const { name, key } = familyName(value);
        const id = randomUUID();
        try {
          const [rows] = await sql.transaction([
            sql`INSERT INTO families (id, name, name_key) VALUES (${id}::uuid, ${name}, ${key}) RETURNING id, name`,
            sql`INSERT INTO family_lists (family_id) VALUES (${id}::uuid)`
          ]);
          return rows[0];
        } catch (error) {
          if (error.code === '23505') throw duplicateFamily();
          throw error;
        }
      },
      read: async familyId => (await load(familyId)).items,
      readState: load,
      async commit(actions, familyId = DEFAULT_FAMILY_ID, options = {}) {
        const id = validateFamilyId(familyId);
        for (let attempt = 0; attempt < 5; attempt++) {
          const current = await load(id);
          const { state, result, changed } = update(current, actions, options);
          if (!changed) return result;
          const saved = JSON.stringify({ entries: state.pantry, history: state.history, requests: state.requests });
          const rows = id === DEFAULT_FAMILY_ID
            ? await sql`UPDATE shopping_list SET items = ${JSON.stringify(state.items)}::jsonb, pantry_state = ${saved}::jsonb, version = version + 1 WHERE id = 1 AND version = ${current.version} RETURNING id`
            : await sql`UPDATE family_lists SET items = ${JSON.stringify(state.items)}::jsonb, pantry_state = ${saved}::jsonb, version = version + 1 WHERE family_id = ${id}::uuid AND version = ${current.version} RETURNING family_id`;
          if (rows.length) return result;
        }
        throw new Error('Listan ändrades samtidigt. Försök igen.');
      }
    };
  }
  if (process.env.RENDER) throw new Error('DATABASE_URL krävs på Render för beständig lagring.');
  const dir = path.resolve(process.env.DATA_DIR || './data');
  await mkdir(dir, { recursive: true });
  const familiesFile = path.join(dir, 'families.json');
  const legacyFor = id => path.join(dir, id === DEFAULT_FAMILY_ID ? 'list.json' : `list-${id}.json`);
  const fileFor = id => path.join(dir, `household-${id}.json`);
  const readJSON = async (file, fallback) => {
    try { return JSON.parse(await readFile(file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; return fallback; }
  };
  const save = async (file, value) => { await writeFile(`${file}.tmp`, JSON.stringify(value)); await rename(`${file}.tmp`, file); };
  let families = await readJSON(familiesFile, null);
  if (!families) { families = [{ id: DEFAULT_FAMILY_ID, name: DEFAULT_FAMILY_NAME }]; await save(familiesFile, families); }
  const states = new Map();
  for (const family of families) states.set(validateFamilyId(family.id), await readJSON(fileFor(family.id), null) ?? emptyState(await readJSON(legacyFor(family.id), [])));
  let queue = Promise.resolve();
  const enqueue = task => { const pending = queue.then(task); queue = pending.catch(() => {}); return pending; };
  const load = (familyId = DEFAULT_FAMILY_ID) => {
    const id = validateFamilyId(familyId);
    if (!states.has(id)) throw familyNotFound();
    return states.get(id);
  };
  return {
    kind: 'file',
    listFamilies: async () => structuredClone(families),
    addFamily(value) {
      const { name, key } = familyName(value);
      return enqueue(async () => {
        if (families.some(family => familyName(family.name).key === key)) throw duplicateFamily();
        const family = { id: randomUUID(), name };
        await save(fileFor(family.id), emptyState([]));
        await save(familiesFile, [...families, family]);
        families.push(family); states.set(family.id, emptyState([]));
        return structuredClone(family);
      });
    },
    read: async familyId => structuredClone(load(familyId).items),
    readState: async familyId => structuredClone(load(familyId)),
    commit(actions, familyId = DEFAULT_FAMILY_ID, options = {}) {
      const id = validateFamilyId(familyId);
      return enqueue(async () => {
        const { state, result, changed } = update(load(id), actions, options);
        if (changed) {
          const next = { ...state, version: state.version + 1 };
          await save(fileFor(id), next); states.set(id, next);
        }
        return structuredClone(result);
      });
    }
  };
}
