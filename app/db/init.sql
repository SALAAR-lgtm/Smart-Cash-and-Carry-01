-- Smart Cash & Carry — Sprint 0 schema
-- Every statement here is idempotent: safe to run on every boot.
--
-- NOTE: table names are capitalised and singular ON PURPOSE (carried over from
-- the previous build). Always double-quote them in raw SQL, e.g.
--   SELECT * FROM "Product";
-- Lowercase "products" fails with "relation does not exist" even though the
-- table is right there. Same rule applies in PGlite.

CREATE TABLE IF NOT EXISTS "Category" (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "Product" (
  id          SERIAL PRIMARY KEY,
  item_id     TEXT UNIQUE,
  name        TEXT NOT NULL,
  weight      TEXT,
  price       NUMERIC(10, 2) NOT NULL,
  category_id INTEGER REFERENCES "Category"(id),
  image_url   TEXT,
  available   BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO "Category" (name) VALUES
  ('Cooking Oils & Ghee'),
  ('Toothpastes & Oral Care'),
  ('Tea & Coffee')
ON CONFLICT (name) DO NOTHING;

-- Sprint 0: three real products, one per category, just to prove the pipeline.
-- Sprint 1 replaces this with a loader for all 119 rows of data/products.csv.
-- Categories are looked up by name rather than by hardcoded id, because SERIAL
-- values drift once ON CONFLICT DO NOTHING skips an insert.
INSERT INTO "Product" (item_id, name, weight, price, category_id, image_url) VALUES
  ('ITEM-001', 'Sufi Canola Oil Pouch', '1 Litre', 598,
    (SELECT id FROM "Category" WHERE name = 'Cooking Oils & Ghee'),
    '/images/ITEM-001.jpg'),
  ('ITEM-009', 'Colgate MaxFresh Spicy Fresh Toothpaste 125g', '125 g', 325,
    (SELECT id FROM "Category" WHERE name = 'Toothpastes & Oral Care'),
    '/images/ITEM-009.jpg'),
  ('ITEM-046', 'Lipton Yellow Label Tea - 900g - Save Rs. 200', '900 g', 1999,
    (SELECT id FROM "Category" WHERE name = 'Tea & Coffee'),
    '/images/ITEM-046.jpg')
ON CONFLICT (item_id) DO NOTHING;
