// A horizontally scrolling row of category chips.
//
// Scrolls rather than wraps: with five categories it fits on a phone, but the
// mart will add more, and wrapped chips would push the product grid off screen.
// The -mx-4 / px-4 pair lets the row bleed to the screen edge while keeping the
// first and last chip aligned with the content — the standard mobile pattern.
export default function CategoryRail({ categories, activeId, onSelect }) {
  // "All" shows the whole catalogue, so its count is the sum of the others
  // rather than a separate number from the server.
  const total = categories.reduce(
    (sum, category) => sum + (category.product_count || 0),
    0
  );

  return (
    <nav aria-label="Product categories" className="-mx-4 mb-4 overflow-x-auto px-4">
      <ul className="flex gap-2 pb-1">
        <li>
          <Chip
            label="All"
            count={total}
            active={activeId === null}
            onClick={() => onSelect(null)}
          />
        </li>

        {categories.map((category) => (
          <li key={category.id}>
            <Chip
              label={category.name}
              count={category.product_count}
              active={activeId === category.id}
              onClick={() => onSelect(category.id)}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Chip({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      // aria-pressed tells a screen reader this is a toggle and which state
      // it is in. Colour alone would convey the same thing visually only.
      aria-pressed={active}
      className={[
        'whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        active
          ? 'border-brand bg-brand text-white'
          : 'border-line bg-white text-ink hover:border-brand/40',
      ].join(' ')}
    >
      {label}
      <span className={`ml-1.5 text-xs ${active ? 'opacity-75' : 'text-muted'}`}>
        {count}
      </span>
    </button>
  );
}
