import { useEffect, useState } from 'react';

const API = '/api';

// Prices are stored as NUMERIC and arrive from Postgres as strings.
// en-PK gives lakh/croat grouping, which is how PKR is written here.
function formatPkr(value) {
  return `PKR ${Number(value).toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function Notice({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-line bg-white text-muted',
    error: 'border-red-200 bg-red-50 text-accent-dark',
  };
  return (
    <div className={`rounded-xl border px-4 py-3.5 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

function ProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
      <div className="flex h-36 items-center justify-center bg-brand-tint">
        {imageFailed || !product.image_url ? (
          <span className="px-3 text-center text-xs text-brand opacity-70">
            {product.category}
          </span>
        ) : (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="h-full w-full object-contain p-2"
          />
        )}
      </div>

      <div className="px-3.5 py-3">
        <p className="mb-1 text-[11px] uppercase tracking-wider text-muted">
          {product.category}
        </p>
        <h2 className="mb-1 text-sm font-medium leading-snug">{product.name}</h2>
        {product.weight && (
          <p className="mb-2 text-xs text-muted">{product.weight}</p>
        )}
        <p className="text-base font-medium text-accent">
          {formatPkr(product.price)}
        </p>
        <p className="mt-2 text-[11px] text-muted">
          {product.item_id} &middot;{' '}
          {product.available ? 'available' : 'unavailable'}
        </p>
      </div>
    </li>
  );
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
    <div className="min-h-screen">
      <header className="bg-brand text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3.5">
          <span
            className="basket-mark relative h-7 w-7 shrink-0 rounded-md bg-white"
            aria-hidden="true"
          />
          <div>
            <h1 className="text-[17px] font-medium tracking-wide">
              Smart Cash &amp; Carry
            </h1>
            <p className="mt-0.5 text-xs opacity-75">
              Noorkot, Punjab &middot; delivery only
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-10 pt-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-medium">All products</h2>
          {status === 'ready' && (
            <span className="text-xs text-muted">{products.length} items</span>
          )}
        </div>

        {status === 'loading' && <Notice>Loading products…</Notice>}

        {status === 'error' && (
          <Notice tone="error">
            <strong>Could not reach the API.</strong>
            <p className="mt-1.5 text-[13px]">
              {error} — is the backend running on port 4000?
            </p>
          </Notice>
        )}

        {status === 'ready' && products.length === 0 && (
          <Notice>No products yet.</Notice>
        )}

        {status === 'ready' && products.length > 0 && (
          <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
