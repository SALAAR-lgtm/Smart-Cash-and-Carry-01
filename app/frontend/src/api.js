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

async function getJson(url, signal) {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    // Prefer the server's own message when it sent one; otherwise fall back to
    // the status code so the UI can still say something useful.
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body && body.error) detail = body.error;
    } catch {
      // Body was not JSON (or was empty) — the status code is enough.
    }
    throw new Error(detail);
  }

  return response.json();
}

export function fetchCategories(signal) {
  return getJson(`${API}/categories`, signal);
}

// category: a numeric category id, or null for "all".
// q:        free text, matched against product names (empty is the same as absent).
export function fetchProducts({ category = null, q = '' } = {}, signal) {
  const params = new URLSearchParams();
  if (category !== null && category !== undefined) {
    params.set('category', String(category));
  }
  const search = typeof q === 'string' ? q.trim() : '';
  if (search) params.set('q', search);

  const queryString = params.toString();
  return getJson(`${API}/products${queryString ? `?${queryString}` : ''}`, signal);
}

export function fetchProduct(id, signal) {
  return getJson(`${API}/products/${id}`, signal);
}
