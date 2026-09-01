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

if (driver === 'pglite') {
  const { PGlite } = await import('@electric-sql/pglite');
  const dataDir = process.env.PGLITE_DIR || path.join(here, '../../.pgdata');

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
}

// Runs db/init.sql on every boot. Every statement in it is idempotent
// (CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING), so re-running is safe.
export async function initDb() {
  const sql = await readFile(path.join(here, '../../db/init.sql'), 'utf8');
  await exec(sql);
}

export { query, driver };
