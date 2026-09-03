-- Smart Cash & Carry — schema
-- Every statement here is idempotent: safe to run on every boot.
--
-- NOTE: table names are capitalised and singular ON PURPOSE (carried over from
-- the previous build). Always double-quote them in raw SQL, e.g.
--   SELECT * FROM "Product";
-- Lowercase "products" fails with "relation does not exist" even though the
-- table is right there. Same rule applies in PGlite.
--
-- "Order" is a SQL reserved word, so quoting it is not optional — an unquoted
-- ORDER fails to parse. This is the one table where the convention really bites.
--
-- Product rows live in seed.sql (generated from data/products.csv), not here.

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

-- Single admin, no signup flow. Seeded from ADMIN_USERNAME / ADMIN_PASSWORD
-- on first boot (Sprint 4). password_hash is bcrypt, never plaintext.
CREATE TABLE IF NOT EXISTS "Admin" (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

-- No status pipeline by design: local delivery doesn't need
-- "preparing / shipped / delivered". One completed flag, toggled by the admin.
CREATE TABLE IF NOT EXISTS "Order" (
  id            SERIAL PRIMARY KEY,
  order_ref     TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  phone         TEXT NOT NULL,
  address       TEXT NOT NULL,
  total         NUMERIC(10, 2) NOT NULL DEFAULT 0,
  completed     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- product_name / price are SNAPSHOTTED at order time, so editing a product's
-- price later never rewrites the total on an order that was already placed.
-- product_id is nullable on purpose: if a product is ever deleted, historical
-- order lines must survive. The snapshot is the record, not the join.
CREATE TABLE IF NOT EXISTS "OrderItem" (
  id                    SERIAL PRIMARY KEY,
  order_id              INTEGER NOT NULL REFERENCES "Order"(id) ON DELETE CASCADE,
  product_id            INTEGER REFERENCES "Product"(id),
  product_name_snapshot TEXT NOT NULL,
  price_snapshot        NUMERIC(10, 2) NOT NULL,
  qty                   INTEGER NOT NULL DEFAULT 1,
  subtotal              NUMERIC(10, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS "OrderItem_order_id_idx" ON "OrderItem" (order_id);
CREATE INDEX IF NOT EXISTS "Product_category_id_idx" ON "Product" (category_id);
CREATE INDEX IF NOT EXISTS "Order_created_at_idx" ON "Order" (created_at DESC);
