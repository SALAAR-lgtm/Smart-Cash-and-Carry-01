import { readFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the project root, NOT from wherever node happened to be
// started. `import 'dotenv/config'` resolves relative to process.cwd(), which
// breaks the moment you run `npm run dev` from inside backend/ instead of
// running `node backend/src/server.js` from app/. Pinning the path makes the
// config identical either way.
dotenv.config({ path: path.join(here, '../../.env') });

// Two drivers, one SQL dialect.
//
//   pglite   -> local dev on Qasim's PC. Real Postgres compiled to WebAssembly,
//               running inside Node. No install, no service, no admin rights.
//               Needed because Docker Desktop cannot run on that machine.
//   postgres -> the real thing, inside Docker on the VM.
//
// Both speak identical SQL, including the capitalised singular table names.
const driver = process.env.DB_DRIVER || 'pglite';

let query;
let exec;
let withTransaction;

if (driver === 'pglite') {
  const { PGlite } = await import('@electric-sql/pglite');

  // Resolved against the project root, NOT the cwd.
  //
  // .env sets PGLITE_DIR=./.pgdata. A relative path like that means "relative
  // to wherever node was started" — so `node src/server.js` from inside
  // backend/ silently created backend/.pgdata, a second, empty database, while
  // the real one sat at app/.pgdata. Both had 119 seeded products, so nothing
  // looked wrong until an order was placed and then could not be found again.
  //
  // Anchoring to projectRoot makes the location identical no matter the cwd.
  // Only one process may own a PGlite directory at a time.
  const projectRoot = path.join(here, '../../');
  const dataDir = process.env.PGLITE_DIR
    ? path.resolve(projectRoot, process.env.PGLITE_DIR)
    : path.join(projectRoot, '.pgdata');

  // PGlite writes postmaster.pid when it opens a data directory and deletes it
  // on a clean shutdown. If the process is killed (Ctrl+C, crash, timeout) that
  // file is left behind, and the next start dies deep inside WASM with a bare
  // "RuntimeError: Aborted()" and no useful message. Clear it before opening.
  //
  // Safe here because exactly one backend process owns this directory. Never
  // point two servers at the same PGLITE_DIR.
  // Uses unlink, not fs.rm: fs.rm routes through a trash/safe-delete layer that
  // refuses and throws inside long-running processes. unlink is a plain delete
  // and ENOENT (file simply not there) is the normal, expected case.
  await unlink(path.join(dataDir, 'postmaster.pid')).catch(() => {});

  const db = new PGlite(dataDir);
  if (db.waitReady) await db.waitReady;

  query = async (sql, params = []) => (await db.query(sql, params)).rows;
  exec = async (sql) => { await db.exec(sql); };

  // PGlite hands the callback a transaction-scoped handle. Every statement
  // inside fn() MUST go through that handle — calling the outer `query` there
  // would silently run outside the transaction.
  withTransaction = (fn) =>
    db.transaction(async (tx) => {
      const scoped = async (sql, params = []) =>
        (await tx.query(sql, params)).rows;
      return fn(scoped);
    });
} else {
  const { Pool } = await import('pg');
  const pool = new Pool({
    host: process.env.DB_HOST || 'db',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
  });

  query = async (sql, params = []) => (await pool.query(sql, params)).rows;
  exec = async (sql) => { await pool.query(sql); };

  // A pool hands out a different connection per query, so a transaction has to
  // borrow ONE client and hold it for the whole block. Running BEGIN and COMMIT
  // through pool.query() would land on unrelated connections and appear to
  // work while doing nothing.
  withTransaction = async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const scoped = async (sql, params = []) =>
        (await client.query(sql, params)).rows;
      const result = await fn(scoped);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      // If the connection died, ROLLBACK throws too. Swallow that so the
      // original error — the one actually worth seeing — is what surfaces.
      try {
        await client.query('ROLLBACK');
      } catch {
        /* connection already unusable */
      }
      throw err;
    } finally {
      client.release();
    }
  };
}

// Runs db/init.sql (schema) then db/seed.sql (catalogue) on every boot.
// Every statement in both is idempotent (CREATE TABLE IF NOT EXISTS +
// ON CONFLICT DO NOTHING), so re-running is safe.
//
// seed.sql is generated from data/products.csv by tools/generate-seed.py —
// never edited by hand.
//
// PGlite's exec() cannot run multiple statements in one call the way the `pg`
// driver can, so both files are executed as a single string each. That works
// because neither file contains a statement PGlite splits on.
export async function initDb() {
  for (const file of ['init.sql', 'seed.sql']) {
    const sql = await readFile(path.join(here, '../../db', file), 'utf8');
    await exec(sql);
  }
}

export { query, exec, withTransaction, driver };
