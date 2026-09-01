import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { query, driver, initDb } from './db.js';

const app = express();
const PORT = Number(process.env.BACKEND_PORT || 4000);

app.use(cors());
app.use(express.json());

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
});
