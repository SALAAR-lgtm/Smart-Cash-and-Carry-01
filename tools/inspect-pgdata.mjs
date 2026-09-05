// Diagnostic: compare the PGlite databases on disk.
//
// Why this exists: PGLITE_DIR was relative ("./.pgdata"), so the database
// landed in a different place depending on which directory node was started
// from. app/.pgdata and app/backend/.pgdata both exist as a result, and an
// order written to one is invisible to the other. This prints the row counts
// of each so the canonical one can be picked before deleting the stray.
//
// Run from anywhere:  node tools/inspect-pgdata.mjs

import { unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');

// @electric-sql/pglite lives in app/backend/node_modules. A bare import from
// tools/ would fail, because ESM walks node_modules up from THIS file's
// directory, not from the cwd. createRequire anchored inside app/backend makes
// resolution start in the right tree.
const require = createRequire(path.join(root, 'app/backend/', 'noop.js'));

const dirs = process.argv.slice(2).length
  ? process.argv.slice(2).map((d) => path.resolve(root, d))
  : [path.join(root, 'app/.pgdata'), path.join(root, 'app/backend/.pgdata')];

async function open(dir) {
  // PGlite leaves postmaster.pid behind after a kill and then refuses to open.
  // Same fix as app/backend/src/db.js.
  await unlink(path.join(dir, 'postmaster.pid')).catch(() => {});
  const { PGlite } = require('@electric-sql/pglite');
  const db = new PGlite(dir);
  if (db.waitReady) await db.waitReady;
  return db;
}

const tables = ['Category', 'Product', 'Order', 'OrderItem'];

for (const dir of dirs) {
  console.log(`\n=== ${path.relative(root, dir)} ===`);
  let db;
  try {
    db = await open(dir);
  } catch (err) {
    console.log(`  could not open: ${err.message}`);
    continue;
  }

  for (const table of tables) {
    try {
      const rows = await db.query(`SELECT count(*)::int AS n FROM "${table}"`);
      console.log(`  ${table.padEnd(12)} ${rows.rows[0].n}`);
    } catch (err) {
      console.log(`  ${table.padEnd(12)} ERROR ${err.message.split('\n')[0]}`);
    }
  }

  // Newest orders make it obvious which database has been receiving writes.
  try {
    const recent = await db.query(
      `SELECT order_ref, total, created_at FROM "Order" ORDER BY id DESC LIMIT 5`
    );
    if (recent.rows.length) {
      console.log('  newest orders:');
      for (const r of recent.rows) {
        console.log(`    ${r.order_ref}  ${r.total}  ${r.created_at}`);
      }
    }
  } catch {
    /* no Order table yet */
  }

  await db.close().catch(() => {});
}
