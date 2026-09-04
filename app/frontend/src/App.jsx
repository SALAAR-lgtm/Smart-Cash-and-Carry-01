import { useEffect, useRef, useState } from 'react';
import { fetchCategories, fetchProducts } from './api';
import Notice from './components/Notice';
import CategoryRail from './components/CategoryRail';
import ProductCard from './components/ProductCard';
import ProductDetail from './components/ProductDetail';

// Typing "tapal" would otherwise fire a request per keystroke: four requests,
// four renders, and they can come back out of order. Waiting 250ms after the
// last keystroke means one request for a word typed at normal speed.
function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function App() {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 250);

  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(null);

  // Distinguishes the very first load ("Loading products…") from a re-query
  // after filters change, where replacing the grid with a spinner would make
  // the list flicker on every keystroke. Instead the old results stay on
  // screen, dimmed, until the new ones land.
  const hasLoaded = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchCategories(controller.signal)
      .then(setCategories)
      .catch((err) => {
        // A failed category rail is not worth blocking the catalogue for — the
        // products still load. The rail simply stays empty.
        if (err.name !== 'AbortError') {
          console.error('categories failed:', err.message);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setStatus(hasLoaded.current ? 'refreshing' : 'loading');
    setError(null);

    fetchProducts({ category: activeCategory, q: debouncedSearch }, controller.signal)
      .then((data) => {
        setProducts(data);
        hasLoaded.current = true;
        setStatus('ready');
      })
      .catch((err) => {
        // Aborting is our own doing (a newer query superseded this one), so it
        // is not an error worth showing.
        if (err.name === 'AbortError') return;
        setError(err.message);
        setStatus('error');
      });

    return () => controller.abort();
  }, [activeCategory, debouncedSearch]);

  const activeName =
    activeCategory === null
      ? 'All products'
      : categories.find((c) => c.id === activeCategory)?.name ?? 'Products';

  const isSearching = debouncedSearch.trim().length > 0;

  return (
    <div className="min-h-screen">
      <header className="bg-brand text-white shadow-md">
        <div className="mx-auto max-w-5xl px-4 pb-3.5 pt-3.5">
          <div className="flex items-center gap-3">
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

          <div className="relative mt-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              // 16px minimum stops iOS Safari from zooming the page when the
              // field is focused, which otherwise happens on every tap.
              className="w-full rounded-xl border border-white/25 bg-white/10 py-2.5 pl-3.5 pr-10 text-base text-white placeholder:text-white/60 focus:border-white/50 focus:outline-none"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-lg leading-none text-white/80 transition hover:bg-white/15 hover:text-white"
              >
                &times;
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-10 pt-5">
        {categories.length > 0 && (
          <CategoryRail
            categories={categories}
            activeId={activeCategory}
            onSelect={setActiveCategory}
          />
        )}

        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-medium">{activeName}</h2>
          {status === 'ready' && (
            <span className="text-xs text-muted">
              {products.length} {products.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {status === 'loading' && <Notice>Loading products…</Notice>}

        {status === 'error' && (
          <Notice tone="error">
            <strong>Could not load products.</strong>
            <p className="mt-1.5 text-[13px]">
              {error} — is the backend running on port 4000?
            </p>
          </Notice>
        )}

        {status === 'ready' && products.length === 0 && (
          <Notice>
            {isSearching ? (
              <>
                Nothing matches &ldquo;{debouncedSearch.trim()}&rdquo;
                {activeCategory !== null && ` in ${activeName}`}.
              </>
            ) : (
              <>No products in this category yet.</>
            )}
          </Notice>
        )}

        {status === 'ready' && products.length > 0 && (
          <ul
            className={[
              'grid grid-cols-1 gap-3.5 transition-opacity sm:grid-cols-2 lg:grid-cols-3',
              status === 'refreshing' ? 'opacity-60' : 'opacity-100',
            ].join(' ')}
          >
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={setSelected}
              />
            ))}
          </ul>
        )}
      </main>

      {selected && (
        <ProductDetail product={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
