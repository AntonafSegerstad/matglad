import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { applyActions, normalizeItems } from './list.js';
import { DEFAULT_FAMILY_ID, DEFAULT_FAMILY_NAME, validateFamilyId, familyName, familyNotFound, duplicateFamily } from './families.js';

export async function createStore() {
  if (process.env.DATABASE_URL) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    const listFamilies = () => sql`SELECT id, name FROM families ORDER BY created_at, id`;
    const load = async (familyId = DEFAULT_FAMILY_ID) => {
      const id = validateFamilyId(familyId);
      const rows = id === DEFAULT_FAMILY_ID
        ? await sql`SELECT items, version FROM shopping_list WHERE id = 1`
        : await sql`SELECT items, version FROM family_lists WHERE family_id = ${id}::uuid`;
      if (!rows[0]) throw familyNotFound();
      return rows[0];
    };
    // Fail startup if the migration or database is unavailable.
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
      read: async familyId => normalizeItems((await load(familyId)).items),
      async commit(actions, familyId = DEFAULT_FAMILY_ID) {
        const id = validateFamilyId(familyId);
        for (let attempt = 0; attempt < 5; attempt++) {
          const current = await load(id);
          const result = applyActions(current.items, actions);
          const rows = id === DEFAULT_FAMILY_ID
            ? await sql`UPDATE shopping_list SET items = ${JSON.stringify(result.items)}::jsonb, version = version + 1 WHERE id = 1 AND version = ${current.version} RETURNING id`
            : await sql`UPDATE family_lists SET items = ${JSON.stringify(result.items)}::jsonb, version = version + 1 WHERE family_id = ${id}::uuid AND version = ${current.version} RETURNING family_id`;
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
  const fileFor = id => path.join(dir, id === DEFAULT_FAMILY_ID ? 'list.json' : `list-${id}.json`);
  const readJSON = async (file, fallback) => {
    try { return JSON.parse(await readFile(file, 'utf8')); }
    catch (error) { if (error.code !== 'ENOENT') throw error; return fallback; }
  };
  const save = async (file, value) => { await writeFile(`${file}.tmp`, JSON.stringify(value)); await rename(`${file}.tmp`, file); };
  let families = await readJSON(familiesFile, null);
  if (!families) { families = [{ id: DEFAULT_FAMILY_ID, name: DEFAULT_FAMILY_NAME }]; await save(familiesFile, families); }
  const lists = new Map();
  for (const family of families) lists.set(validateFamilyId(family.id), await readJSON(fileFor(family.id), []));
  let queue = Promise.resolve();
  const enqueue = task => { const pending = queue.then(task); queue = pending.catch(() => {}); return pending; };
  const load = (familyId = DEFAULT_FAMILY_ID) => {
    const id = validateFamilyId(familyId);
    if (!lists.has(id)) throw familyNotFound();
    return lists.get(id);
  };
  return {
    kind: 'file',
    listFamilies: async () => structuredClone(families),
    addFamily(value) {
      const { name, key } = familyName(value);
      return enqueue(async () => {
        if (families.some(family => familyName(family.name).key === key)) throw duplicateFamily();
        const family = { id: randomUUID(), name };
        await save(fileFor(family.id), []);
        await save(familiesFile, [...families, family]);
        families.push(family); lists.set(family.id, []);
        return structuredClone(family);
      });
    },
    read: async familyId => normalizeItems(structuredClone(load(familyId))),
    commit(actions, familyId = DEFAULT_FAMILY_ID) {
      const id = validateFamilyId(familyId);
      return enqueue(async () => {
        const result = applyActions(load(id), actions);
        await save(fileFor(id), result.items);
        lists.set(id, result.items);
        return result;
      });
    }
  };
}
