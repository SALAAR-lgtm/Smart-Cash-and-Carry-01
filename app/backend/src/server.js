import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, driver, initDb } from './db.js';

// NOTE: deliberately no `import 'dotenv/config'` here. db.js loads app/.env by
// an explicit path; a bare dotenv/config resolves from process.cwd() and would
// silently miss it the moment this file is run from inside backend/.

const here = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.BACKEND_PORT || 4000);

// Product images live in data/images at the repo root, outside app/, so the
// catalogue stays separable from the code. Relative to here (app/backend/src):
//   ../..    -> app
//   ../../.. -> repo root
// IMAGES_DIR lets Docker override it — the backend image lays files out
// differently, so the Dockerfile sets this to an absolute path.
const IMAGES_DIR =
  process.env.IMAGES_DIR || path.join(here, '../../../data/images');

app.use(cors());
app.use(express.json());

// Mounted before the API routes so /images/... never falls through to JSON 404.
app.use(
  '/images',
  express.static(IMAGES_DIR, {
    maxAge: '7d',
    index: false,
    fallthrough: true,
  })
);

// Every product read joins Category for the display name. Written once so the
// list and the detail view can never drift in what they return.
const PRODUCT_COLUMNS = `
  p.id,
  p.item_id,
  p.name,
  p.weight,
  p.price,
  p.image_url,
  p.available,
  p.category_id,
  c.name AS category
`;

const PRODUCT_FROM = `
  FROM "Product" p
  JOIN "Category" c ON c.id = p.category_id
`;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', driver });
});

// Categories come from the database, never hardcoded. The mockups in
// reference/ show nine categories; the real catalogue has five.
//
// The LEFT JOIN matters: an INNER JOIN would silently drop any category that
// currently has no products, so adding a category would make it invisible
// until its first product arrived. Better to show it with a count of 0.
//
// COUNT() returns bigint, which the pg driver serialises as a string. Casting
// to int keeps the JSON identical between PGlite locally and Postgres on the
// VM — without the cast, `count + 1` in the UI does string concatenation.
app.get('/api/categories', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        c.id,
        c.name,
        COUNT(p.id)::int AS product_count
      FROM "Category" c
      LEFT JOIN "Product" p ON p.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/categories failed:', err.message);
    res.status(500).json({ error: 'failed to load categories' });
  }
});

// Optional filters: ?category=<id> and ?q=<search text>.
//
// Both are bound as parameters, never interpolated into the SQL string. The
// search text reaches the database as a value, so a quote or semicolon in it is
// just a character to match — there is no injection risk beyond using
// placeholders. The validation below is about rejecting nonsense, not safety.
app.get('/api/products', async (req, res) => {
  try {
    const { category, q } = req.query;

    const conditions = [];
    const params = [];

    if (category !== undefined && category !== '') {
      const categoryId = Number(category);
      if (!Number.isInteger(categoryId)) {
        return res
          .status(400)
          .json({ error: 'category must be a numeric category id' });
      }
      params.push(categoryId);
      conditions.push(`p.category_id = $${params.length}`);
    }

    const search = typeof q === 'string' ? q.trim() : '';
    if (search) {
      params.push(`%${search}%`);
      // ILIKE is case-insensitive LIKE. Customers type lowercase, product names
      // are in caps ("TAPAL DANEDAR"), so a case-sensitive match would return
      // nothing for every normal query.
      conditions.push(`p.name ILIKE $${params.length}`);
    }

    const sql = `
      SELECT ${PRODUCT_COLUMNS}
      ${PRODUCT_FROM}
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY p.name, p.id
    `;

    res.json(await query(sql, params));
  } catch (err) {
    console.error('GET /api/products failed:', err.message);
    res.status(500).json({ error: 'failed to load products' });
  }
});

// Declared after /api/products so Express matches the exact list route first.
app.get('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'product id must be a number' });
    }

    const rows = await query(
      `SELECT ${PRODUCT_COLUMNS} ${PRODUCT_FROM} WHERE p.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'product not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(`GET /api/products/${req.params.id} failed:`, err.message);
    res.status(500).json({ error: 'failed to load product' });
  }
});

await initDb();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`backend up on http://0.0.0.0:${PORT}  (db driver: ${driver})`);
  console.log(`serving images from ${IMAGES_DIR}`);
});
