import { useState } from 'react';
import { formatPkr } from '../api';
import { useCart } from '../cart';
import { useDismiss } from '../hooks/useDismiss';

// A bottom sheet on phones, a centred dialog on wider screens.
//
// Built as an overlay rather than a separate page/route: the catalogue scroll
// position stays exactly where it was when the sheet closes, which matters on a
// phone where a route change would drop the user back at the top of a
// hundred-item list.
export default function ProductDetail({ product, onClose }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [qty, setQty] = useState(1);
  const { add } = useCart();

  useDismiss(onClose);

  const inStock = product.available;

  const handleAdd = () => {
    if (!inStock) return;
    add(product, qty);
    // Close on add. The count on the basket button is the confirmation, and it
    // puts the customer straight back to browsing in one tap — which is what
    // you want when someone is building a basket item by item.
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      {/* Backdrop. Clicking anywhere outside the sheet closes it. */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="relative flex h-56 items-center justify-center bg-brand-tint sm:h-64">
          {product.image_url && !imageFailed ? (
            <img
              src={product.image_url}
              alt={product.name}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-contain p-4"
            />
          ) : (
            <span className="px-6 text-center text-sm text-brand opacity-70">
              {product.category}
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-xl leading-none text-ink shadow-sm transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="mb-1.5 text-[11px] uppercase tracking-wider text-muted">
            {product.category}
          </p>

          <h2 className="text-lg font-medium leading-snug">{product.name}</h2>

          {product.weight && (
            <p className="mt-1 text-sm text-muted">{product.weight}</p>
          )}

          <p className="mt-3 text-2xl font-medium text-accent">
            {formatPkr(product.price)}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={[
                'rounded-full px-2.5 py-1 text-xs font-medium',
                inStock
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-accent-dark',
              ].join(' ')}
            >
              {inStock ? 'In stock' : 'Out of stock'}
            </span>
            <span className="text-[11px] text-muted">{product.item_id}</span>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setQty((current) => Math.max(1, current - 1))}
                disabled={qty <= 1 || !inStock}
                aria-label="Decrease quantity"
                className="h-10 w-10 rounded-full border border-line text-lg leading-none text-ink transition hover:border-brand disabled:opacity-40 disabled:hover:border-line"
              >
                &minus;
              </button>
              {/* aria-live so a screen reader announces the new quantity. */}
              <span aria-live="polite" className="w-8 text-center text-base">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((current) => Math.min(99, current + 1))}
                disabled={qty >= 99 || !inStock}
                aria-label="Increase quantity"
                className="h-10 w-10 rounded-full border border-line text-lg leading-none text-ink transition hover:border-brand disabled:opacity-40 disabled:hover:border-line"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={!inStock}
              className="w-full rounded-xl bg-brand py-3 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-40 disabled:hover:bg-brand"
            >
              {inStock ? 'Add to basket' : 'Out of stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
