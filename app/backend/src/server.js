import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { query, withTransaction, driver, initDb } from './db.js';

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

// Thrown from inside a transaction when the problem is the request, not the
// server. Caught at the route so it becomes the right status code instead of a
// blanket 500.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Money is handled as integer cents throughout, then rendered as a fixed
// 2-decimal string at the edges. Doing arithmetic on NUMERIC values as floats
// is how you get a total of 1234.5600000000001.
function toCents(price) {
  return Math.round(Number(price) * 100);
}

function fromCents(cents) {
  return (cents / 100).toFixed(2);
}

// e.g. SCC-20260904-9F3A1C. The schema makes order_ref UNIQUE; 3 random bytes
// gives ~16 million values per day, which is ample for a single mart.
function makeOrderRef() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `SCC-${stamp}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

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

// Optional filters: ?category=<id>, ?q=<search text>, ?ids=1,2,3
//
// All are bound as parameters, never interpolated into the SQL string. Search
// text reaches the database as a value, so a quote or semicolon in it is just a
// character to match — there is no injection risk beyond using placeholders.
// The validation below is about rejecting nonsense, not safety.
app.get('/api/products', async (req, res) => {
  try {
    const { category, q, ids } = req.query;

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

    // ?ids= exists so a basket restored from localStorage can be re-priced
    // from the database. Storing whole product objects locally would show a
    // stale price if the mart changed one.
    if (ids !== undefined && ids !== '') {
      const wantedIds = String(ids)
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);

      if (wantedIds.length === 0) {
        return res
          .status(400)
          .json({ error: 'ids must be a comma-separated list of product ids' });
      }

      const placeholders = wantedIds.map((id) => {
        params.push(id);
        return `$${params.length}`;
      });
      conditions.push(`p.id IN (${placeholders.join(', ')})`);
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

// Places an order.
//
// The client sends product ids and quantities ONLY — never a price. Prices are
// re-read from the database here and the total is computed on the server. A
// client-supplied price is a customer writing their own bill, and a
// client-supplied total is worse than that.
//
// Everything runs in one transaction: an order header without its lines, or
// lines without a header, is worse than a clean failure.
app.post('/api/orders', async (req, res) => {
  const { customer_name, phone, address, items } = req.body ?? {};

  const missing = [];
  if (typeof customer_name !== 'string' || !customer_name.trim()) {
    missing.push('customer_name');
  }
  if (typeof phone !== 'string' || !phone.trim()) missing.push('phone');
  if (typeof address !== 'string' || !address.trim()) missing.push('address');
  if (missing.length > 0) {
    return res
      .status(400)
      .json({ error: `missing required field(s): ${missing.join(', ')}` });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res
      .status(400)
      .json({ error: 'items must be a non-empty array' });
  }

  for (const item of items) {
    const productId = Number(item?.product_id);
    const qty = Number(item?.qty);
    if (!Number.isInteger(productId) || productId < 1) {
      return res
        .status(400)
        .json({ error: 'each item needs a positive integer product_id' });
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      return res
        .status(400)
        .json({ error: `qty for product ${productId} must be 1-99` });
    }
  }

  // The same product can arrive twice (added before a rehydrate, say), so merge
  // by id rather than trusting the client to have de-duplicated.
  const merged = new Map();
  for (const item of items) {
    const productId = Number(item.product_id);
    merged.set(productId, (merged.get(productId) || 0) + Number(item.qty));
  }
  const wanted = [...merged].map(([productId, qty]) => ({ productId, qty }));
  const oversized = wanted.find((line) => line.qty > 99);
  if (oversized) {
    return res
      .status(400)
      .json({ error: `qty for product ${oversized.productId} must be 1-99` });
  }

  try {
    const order = await withTransaction(async (q) => {
      const placeholders = wanted.map((_, i) => `$${i + 1}`).join(', ');
      const products = await q(
        `SELECT id, name, price, available FROM "Product" WHERE id IN (${placeholders})`,
        wanted.map((line) => line.productId)
      );

      // Fewer rows than requested means at least one id is gone from the
      // catalogue — deleted, or never real.
      if (products.length !== wanted.length) {
        const found = new Set(products.map((p) => p.id));
        const gone = wanted
          .filter((line) => !found.has(line.productId))
          .map((line) => line.productId);
        throw new HttpError(
          409,
          `no longer in the catalogue: ${gone.join(', ')}`
        );
      }

      const soldOut = products.filter((p) => !p.available).map((p) => p.name);
      if (soldOut.length > 0) {
        throw new HttpError(409, `out of stock: ${soldOut.join(', ')}`);
      }

      const byId = new Map(products.map((p) => [p.id, p]));

      let totalCents = 0;
      const lines = wanted.map((line) => {
        const product = byId.get(line.productId);
        const unitCents = toCents(product.price);
        const subtotalCents = unitCents * line.qty;
        totalCents += subtotalCents;

        // Snapshotting name and price is the whole point of OrderItem: editing
        // or deleting a product later must never rewrite the history of an
        // order that was already placed.
        return {
          product_id: product.id,
          product_name_snapshot: product.name,
          price_snapshot: fromCents(unitCents),
          qty: line.qty,
          subtotal: fromCents(subtotalCents),
        };
      });

      const [created] = await q(
        `INSERT INTO "Order" (order_ref, customer_name, phone, address, total)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, order_ref, customer_name, phone, address, total, created_at`,
        [
          makeOrderRef(),
          customer_name.trim(),
          phone.trim(),
          address.trim(),
          fromCents(totalCents),
        ]
      );

      for (const line of lines) {
        await q(
          `INSERT INTO "OrderItem"
             (order_id, product_id, product_name_snapshot, price_snapshot, qty, subtotal)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            created.id,
            line.product_id,
            line.product_name_snapshot,
            line.price_snapshot,
            line.qty,
            line.subtotal,
          ]
        );
      }

      return created;
    });

    res.status(201).json(order);
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error('POST /api/orders failed:', err.message);
    res.status(500).json({ error: 'failed to place order' });
  }
});

await initDb();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`backend up on http://0.0.0.0:${PORT}  (db driver: ${driver})`);
  console.log(`serving images from ${IMAGES_DIR}`);
});
