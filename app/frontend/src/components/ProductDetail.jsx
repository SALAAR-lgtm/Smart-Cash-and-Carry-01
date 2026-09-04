import { useEffect, useState } from 'react';
import { formatPkr } from '../api';

// A bottom sheet on phones, a centred dialog on wider screens.
//
// Built as an overlay rather than a separate page/route: the catalogue scroll
// position stays exactly where it was when the sheet closes, which matters on a
// phone where a route change would drop the user back at the top of a
// hundred-item list. Routing can come with the cart in Sprint 3 if it is needed.
export default function ProductDetail({ product, onClose }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);

    // Stop the catalogue behind the sheet from scrolling. Without this, a
    // swipe on the sheet scrolls the page underneath on mobile Safari.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

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
                product.available
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-accent-dark',
              ].join(' ')}
            >
              {product.available ? 'In stock' : 'Out of stock'}
            </span>
            <span className="text-[11px] text-muted">{product.item_id}</span>
          </div>

          {/* The quantity stepper and basket button belong to Sprint 3.
              They are rendered disabled rather than hidden so the layout is
              already visible and reviewable, and so nothing pretends to work
              before it does. */}
          <div className="mt-6 opacity-60" aria-disabled="true">
            <div className="mb-3 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled
                className="h-10 w-10 rounded-full border border-line text-lg text-muted"
              >
                &minus;
              </button>
              <span className="w-6 text-center text-base">1</span>
              <button
                type="button"
                disabled
                className="h-10 w-10 rounded-full border border-line text-lg text-muted"
              >
                +
              </button>
            </div>

            <button
              type="button"
              disabled
              className="w-full rounded-xl bg-brand py-3 text-sm font-medium text-white"
            >
              Add to basket
            </button>

            <p className="mt-2.5 text-center text-[11px] text-muted">
              Ordering is switched on in the next stage of the build.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
