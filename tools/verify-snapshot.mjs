// Verifies the Sprint 3 rule that makes checkout trustworthy:
//
//   An order must keep the price it was placed at. If someone edits the
//   product's price afterwards, old orders must NOT change.
//
// How it proves it:
//   1. read the order + its line items (as stored)
//   2. change the product's price to something obvious (999)
//   3. read the order again — total and price_snapshot must be unchanged
//   4. put the original price back
//
// It also checks that a REJECTED order left no rows behind, which is the other
// half of "the transaction works".
//
// The backend must be STOPPED before running this: only one process can own a
// PGlite data directory at a time.
//
// Usage: node tools/verify-snapshot.mjs <order_ref> <product_id> <expected_total>

import { unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const require = createRequire(path.join(root, 'app/backend/', 'noop.js'));

const [orderRef, productId, expectedTotal] = process.argv.slice(2);
if (!orderRef || !productId || !expectedTotal) {
  console.error(
    'usage: node tools/verify-snapshot.mjs <order_ref> <product_id> <expected_total>'
  );
  process.exit(2);
}

const dataDir = path.join(root, 'app/.pgdata');
await unlink(path.join(dataDir, 'postmaster.pid')).catch(() => {});

const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite(dataDir);
if (db.waitReady) await db.waitReady;

const q = async (sql, params = []) => (await db.query(sql, params)).rows;

let failures = 0;
const check = (label, actual, expected) => {
  const ok = String(actual) === String(expected);
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: ${actual}${ok ? '' : ` (expected ${expected})`}`);
};

async function readOrder(ref) {
  const orders = await q(
    `SELECT id, order_ref, total, customer_name, created_at
       FROM "Order" WHERE order_ref = $1`,
    [ref]
  );
  if (orders.length === 0) throw new Error(`no order with ref ${ref}`);
  const items = await q(
    `SELECT product_id, product_name_snapshot, price_snapshot, qty, subtotal
       FROM "OrderItem" WHERE order_id = $1 ORDER BY id`,
    [orders[0].id]
  );
  return { order: orders[0], items };
}

console.log(`\n=== order ${orderRef} ===`);

const before = await readOrder(orderRef);
console.log('  BEFORE price change:');
console.log(`    total          ${before.order.total}`);
for (const it of before.items) {
  console.log(
    `    item           ${it.product_name_snapshot} @ ${it.price_snapshot} x ${it.qty} = ${it.subtotal}`
  );
}

// Sanity: the order must match what the API said it charged.
check('order total matches API response', before.order.total, expectedTotal);

const product = await q(
  `SELECT id, name, price FROM "Product" WHERE id = $1`,
  [productId]
);
if (product.length === 0) throw new Error(`no product ${productId}`);
const originalPrice = product[0].price;
console.log(`  product ${productId} (${product[0].name}) is currently ${originalPrice}`);

// --- the actual test: move the price, see whether history follows it ---
console.log(`\n  changing product ${productId} price  ->  999.00`);
await q(`UPDATE "Product" SET price = 999 WHERE id = $1`, [productId]);

const after = await readOrder(orderRef);
console.log('  AFTER price change:');
console.log(`    total          ${after.order.total}`);
for (const it of after.items) {
  console.log(
    `    item           ${it.product_name_snapshot} @ ${it.price_snapshot} x ${it.qty} = ${it.subtotal}`
  );
}

console.log('\n  --- assertions ---');
check('order total unchanged', after.order.total, before.order.total);
for (let i = 0; i < before.items.length; i += 1) {
  check(
    `line ${i + 1} price_snapshot unchanged (${before.items[i].product_name_snapshot})`,
    after.items[i].price_snapshot,
    before.items[i].price_snapshot
  );
  check(
    `line ${i + 1} subtotal unchanged`,
    after.items[i].subtotal,
    before.items[i].subtotal
  );
  check(
    `line ${i + 1} name snapshot unchanged`,
    after.items[i].product_name_snapshot,
    before.items[i].product_name_snapshot
  );
}

// The catalogue itself SHOULD reflect the new price — only history is frozen.
const moved = await q(`SELECT price FROM "Product" WHERE id = $1`, [productId]);
check('product price DID change in catalogue', moved[0].price, '999.00');

// --- restore ---
await q(`UPDATE "Product" SET price = $1 WHERE id = $2`, [originalPrice, productId]);
const restored = await q(`SELECT price FROM "Product" WHERE id = $1`, [productId]);
console.log(`\n  restored product ${productId} price -> ${restored[0].price}`);
check('price restored', restored[0].price, originalPrice);

// --- did a rejected order leave anything behind? ---
console.log('\n  --- rejected order left no rows ---');
const ghosts = await q(
  `SELECT count(*)::int AS n FROM "Order" WHERE customer_name = 'Rollback Probe'`
);
check('no Order row for rejected order', ghosts[0].n, 0);

const orphanItems = await q(
  `SELECT count(*)::int AS n FROM "OrderItem" oi
     LEFT JOIN "Order" o ON o.id = oi.order_id
    WHERE o.id IS NULL`
);
check('no orphaned OrderItem rows', orphanItems[0].n, 0);

await db.close().catch(() => {});

console.log(
  failures === 0
    ? '\nRESULT: all checks passed — the price snapshot holds.\n'
    : `\nRESULT: ${failures} check(s) FAILED.\n`
);
process.exit(failures === 0 ? 0 : 1);
