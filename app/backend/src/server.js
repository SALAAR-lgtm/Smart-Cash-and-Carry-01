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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', driver });
});

app.get('/api/products', async (req, res) => {
  try {
    const rows = await query(`
      SELECT
        p.id,
        p.item_id,
        p.name,
        p.weight,
        p.price,
        p.image_url,
        p.available,
        c.name AS category
      FROM "Product" p
      JOIN "Category" c ON c.id = p.category_id
      ORDER BY p.id
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /api/products failed:', err.message);
    res.status(500).json({ error: 'failed to load products' });
  }
});

await initDb();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`backend up on http://0.0.0.0:${PORT}  (db driver: ${driver})`);
  console.log(`serving images from ${IMAGES_DIR}`);
});
