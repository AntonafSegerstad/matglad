import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { applyActions } from './list.js';

export async function createStore() {
  if (process.env.DATABASE_URL) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    const load = async () => {
      const [row] = await sql`SELECT items, version FROM shopping_list WHERE id = 1`;
      if (!row) throw new Error('Listan är inte initierad.');
      return row;
    };
    // Fail startup if schema or database is unavailable.
    await load();
    return {
      kind: 'postgres',
      read: async () => (await load()).items,
      async commit(actions) {
        // Compare-and-swap avoids losing updates during overlapping requests/deploys.
        for (let attempt = 0; attempt < 5; attempt++) {
          const current = await load();
          const result = applyActions(current.items, actions);
          const rows = await sql`UPDATE shopping_list SET items = ${JSON.stringify(result.items)}::jsonb, version = version + 1 WHERE id = 1 AND version = ${current.version} RETURNING id`;
          if (rows.length) return result;
        }
        throw new Error('Listan ändrades samtidigt. Försök igen.');
      }
    };
  }
  if (process.env.RENDER) throw new Error('DATABASE_URL krävs på Render för beständig lagring.');
  const dir = path.resolve(process.env.DATA_DIR || './data');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, 'list.json');
  let items;
  try { items = JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; items = []; }
  let queue = Promise.resolve();
  return {
    kind: 'file',
    read: async () => structuredClone(items),
    commit(actions) {
      const task = queue.then(async () => {
        const result = applyActions(items, actions);
        await writeFile(`${file}.tmp`, JSON.stringify(result.items));
        await rename(`${file}.tmp`, file);
        items = result.items;
        return result;
      });
      queue = task.catch(() => {});
      return task;
    }
  };
}
