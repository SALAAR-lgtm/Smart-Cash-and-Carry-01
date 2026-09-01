import { useEffect, useState } from 'react';

const API = '/api';

function formatPkr(value) {
  return `PKR ${Number(value).toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/products`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setProducts(data);
        setStatus('ready');
      })
      .catch((err) => {
        setError(err.message);
        setStatus('error');
      });
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="logo-mark" aria-hidden="true" />
          <div>
            <h1>Smart Cash &amp; Carry</h1>
            <p className="tagline">Noorkot, Punjab &middot; delivery only</p>
          </div>
        </div>
      </header>

      <main className="content">
        {status === 'loading' && <p className="notice">Loading products…</p>}

        {status === 'error' && (
          <div className="notice notice-error">
            <strong>Could not reach the API.</strong>
            <p>{error} — is the backend running on port 4000?</p>
          </div>
        )}

        {status === 'ready' && products.length === 0 && (
          <p className="notice">No products yet.</p>
        )}

        {status === 'ready' && products.length > 0 && (
          <ul className="grid">
            {products.map((p) => (
              <li key={p.id} className="card">
                <div className="card-image">
                  <span className="card-image-fallback">{p.category}</span>
                </div>
                <div className="card-body">
                  <p className="card-category">{p.category}</p>
                  <h2 className="card-title">{p.name}</h2>
                  {p.weight && <p className="card-weight">{p.weight}</p>}
                  <p className="card-price">{formatPkr(p.price)}</p>
                  <p className="card-meta">
                    {p.item_id} &middot; {p.available ? 'available' : 'unavailable'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
