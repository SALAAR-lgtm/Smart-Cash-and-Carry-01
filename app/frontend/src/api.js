// Every call the frontend makes to the backend lives here, so a component
// never hand-rolls a fetch and the error handling stays in one place.
//
// Vite proxies /api to the backend on :4000 (see vite.config.js), so this is a
// relative URL in development and behind Nginx in production — the same code
// works in both with no environment switch.

const API = '/api';

// Prices are stored as NUMERIC and arrive from Postgres as strings.
// en-PK gives lakh/croat grouping, which is how PKR is written here.
export function formatPkr(value) {
  return `PKR ${Number(value).toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// Prefer the server's own message when it sent one; otherwise fall back to the
// status code so the UI can still say something useful.
async function errorFrom(response) {
  let detail = `HTTP ${response.status}`;
  try {
    const body = await response.json();
    if (body && body.error) detail = body.error;
  } catch {
    // Body was not JSON (or was empty) — the status code is enough.
  }
  return new Error(detail);
}

async function getJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw await errorFrom(response);
  return response.json();
}

async function postJson(url, body, signal) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw await errorFrom(response);
  return response.json();
}

export function fetchCategories(signal) {
  return getJson(`${API}/categories`, signal);
}

// category: a numeric category id, or null for "all".
// q:        free text, matched against product names (empty is the same as absent).
// ids:      array of product ids; used to re-price a basket restored from
//           localStorage so a cached price is never shown as current.
export function fetchProducts({ category = null, q = '', ids = null } = {}, signal) {
  const params = new URLSearchParams();

  if (category !== null && category !== undefined) {
    params.set('category', String(category));
  }

  const search = typeof q === 'string' ? q.trim() : '';
  if (search) params.set('q', search);

  if (Array.isArray(ids) && ids.length > 0) {
    params.set('ids', ids.join(','));
  }

  const queryString = params.toString();
  return getJson(`${API}/products${queryString ? `?${queryString}` : ''}`, signal);
}

export function fetchProduct(id, signal) {
  return getJson(`${API}/products/${id}`, signal);
}

// Sends product ids and quantities ONLY — never a price. The server re-reads
// every price and computes the total itself; a client-supplied price would let
// a customer set their own bill.
export function createOrder({ customerName, phone, address, lines }, signal) {
  return postJson(
    `${API}/orders`,
    {
      customer_name: customerName,
      phone,
      address,
      items: lines.map((line) => ({
        product_id: line.product.id,
        qty: line.qty,
      })),
    },
    signal
  );
}
