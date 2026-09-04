import { useState } from 'react';
import { formatPkr } from '../api';

// The whole card is a <button> so it is reachable by keyboard and screen
// readers for free. A clickable <div> would need tabIndex, a key handler and
// an ARIA role bolted on, and would still be wrong for screen readers.
export default function ProductCard({ product, onSelect }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(product.image_url) && !imageFailed;

  return (
    <li className="flex">
      <button
        type="button"
        onClick={() => onSelect(product)}
        className="flex w-full flex-col overflow-hidden rounded-xl border border-line bg-white text-left transition hover:border-brand hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <div className="flex h-36 items-center justify-center bg-brand-tint">
          {showImage ? (
            <img
              src={product.image_url}
              alt={product.name}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="h-full w-full object-contain p-2"
            />
          ) : (
            // Falls back to the category name if the photo is missing or fails
            // to load, so a broken URL never leaves a blank hole in the grid.
            <span className="px-3 text-center text-xs text-brand opacity-70">
              {product.category}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col px-3.5 py-3">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-muted">
            {product.category}
          </p>
          <h3 className="mb-1 text-sm font-medium leading-snug">
            {product.name}
          </h3>
          {product.weight && (
            <p className="mb-2 text-xs text-muted">{product.weight}</p>
          )}

          {/* mt-auto pins the price to the bottom, so cards of differing text
              length still line up across the row. */}
          <p className="mt-auto pt-2 text-base font-medium text-accent">
            {formatPkr(product.price)}
          </p>

          {!product.available && (
            <p className="mt-1.5 text-[11px] font-medium text-muted">
              Currently unavailable
            </p>
          )}
        </div>
      </button>
    </li>
  );
}
