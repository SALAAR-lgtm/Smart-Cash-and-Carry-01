import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchProducts } from './api';

// The basket, shared by the header count, the product sheet and the checkout
// sheet. One source of truth — three components that would otherwise each hold
// a copy and disagree.

const CartContext = createContext(null);
const STORAGE_KEY = 'scc-basket-v1';
const MAX_QTY = 99;

// Only {productId, qty} is ever written to storage — never a price or a name.
// A saved price goes stale the moment the mart changes one, and showing it
// would be showing a lie. Ids and quantities are the only facts that survive a
// reload honestly; the rest is re-fetched from the database.
function readStoredLines() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((line) => ({
        productId: Number(line?.productId),
        qty: Number(line?.qty),
      }))
      .filter(
        (line) =>
          Number.isInteger(line.productId) &&
          line.productId > 0 &&
          Number.isInteger(line.qty) &&
          line.qty > 0
      )
      .slice(0, 200); // a hand-edited or corrupt value should not capsize the app
  } catch {
    // Private browsing, storage disabled, or someone edited the value by hand.
    // None of that should stop a customer from ordering.
    return [];
  }
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState([]);

  // Gate for "hydration finished". Without it the persist effect below would
  // write an empty basket over the saved one on first paint.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredLines();

    if (stored.length === 0) {
      setReady(true);
      return;
    }

    const controller = new AbortController();

    fetchProducts(
      { ids: stored.map((line) => line.productId) },
      controller.signal
    )
      .then((products) => {
        const byId = new Map(products.map((product) => [product.id, product]));
        // Drop anything no longer in the catalogue rather than showing a ghost
        // line the order would reject later.
        setLines(
          stored
            .filter((line) => byId.has(line.productId))
            .map((line) => ({
              product: byId.get(line.productId),
              qty: Math.min(MAX_QTY, line.qty),
            }))
        );
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('could not restore basket:', err.message);
        }
      })
      .finally(() => setReady(true));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          lines.map((line) => ({
            productId: line.product.id,
            qty: line.qty,
          }))
        )
      );
    } catch {
      // Storage full or blocked. The basket keeps working for this session.
    }
  }, [lines, ready]);

  const value = useMemo(() => {
    const add = (product, qty = 1) =>
      setLines((prev) => {
        const found = prev.find((line) => line.product.id === product.id);
        if (found) {
          return prev.map((line) =>
            line.product.id === product.id
              ? { ...line, qty: Math.min(MAX_QTY, line.qty + qty) }
              : line
          );
        }
        return [...prev, { product, qty: Math.min(MAX_QTY, qty) }];
      });

    // Dropping to 0 removes the line — that is what the stepper's "−" does at 1.
    const setQty = (productId, qty) =>
      setLines((prev) =>
        qty < 1
          ? prev.filter((line) => line.product.id !== productId)
          : prev.map((line) =>
              line.product.id === productId
                ? { ...line, qty: Math.min(MAX_QTY, qty) }
                : line
            )
      );

    const remove = (productId) =>
      setLines((prev) => prev.filter((line) => line.product.id !== productId));

    const clear = () => setLines([]);

    return {
      lines,
      ready,
      add,
      setQty,
      remove,
      clear,
      count: lines.reduce((sum, line) => sum + line.qty, 0),
      // For DISPLAY ONLY. The server re-reads every price and computes the real
      // total when the order is placed, so this number can never be trusted for
      // charging — only for showing the customer what to expect.
      totalCents: lines.reduce(
        (sum, line) =>
          sum + Math.round(Number(line.product.price) * 100) * line.qty,
        0
      ),
    };
  }, [lines, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) {
    throw new Error('useCart() must be called inside <CartProvider>');
  }
  return cart;
}
