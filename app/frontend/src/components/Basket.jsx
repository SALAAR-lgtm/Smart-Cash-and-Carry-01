import { useCallback, useState } from 'react';
import { createOrder, formatPkr } from '../api';
import { useCart } from '../cart';
import { useDismiss } from '../hooks/useDismiss';
import Notice from './Notice';

// Three steps in one sheet: review the basket, enter delivery details, see the
// confirmation.
//
// Keeping them in one component rather than three routed pages means the
// basket never has to be serialised into a URL or global store — it is already
// in context, and going "back" is just a state change.
export default function Basket({ onClose }) {
  const { lines, setQty, remove, clear, count, totalCents } = useCart();

  const [step, setStep] = useState('basket'); // basket | checkout | placed
  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    address: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [placed, setPlaced] = useState(null);

  // Mid-checkout there is typed input to lose, so Escape and the backdrop are
  // switched off until the order is either placed or stepped back. useCallback
  // keeps the handler identity stable so the effect does not re-run each render.
  const dismiss = useCallback(() => {
    if (step !== 'checkout') onClose();
  }, [step, onClose]);

  useDismiss(dismiss);

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  // Mirrors the server's rules. This is for immediate feedback only — the
  // server validates again, because nothing from a browser can be trusted.
  function validate(values) {
    const found = {};

    if (!values.customerName.trim()) {
      found.customerName = 'Enter a name for the order.';
    }

    const digits = values.phone.replace(/\D/g, '');
    if (!digits) {
      found.phone = 'Enter a phone number.';
    } else if (digits.length < 10 || digits.length > 15) {
      found.phone = 'Enter a valid phone number (10–15 digits).';
    }

    if (values.address.trim().length < 10) {
      found.address = 'Enter the full delivery address.';
    }

    return found;
  }

  const submit = async (event) => {
    event.preventDefault();

    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const created = await createOrder({
        customerName: form.customerName,
        phone: form.phone,
        address: form.address,
        lines,
      });

      // Capture the item count before emptying — `count` is about to be 0.
      setPlaced({ ...created, itemCount: count });

      // Only cleared on success. A failed order must leave the basket intact,
      // or the customer loses their shopping because of a network blip.
      clear();
      setStep('placed');
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Your basket"
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={step === 'checkout' ? undefined : onClose}
        aria-hidden="true"
      />

      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-base font-medium">
            {step === 'basket' && 'Your basket'}
            {step === 'checkout' && 'Delivery details'}
            {step === 'placed' && 'Order placed'}
          </h2>

          {step !== 'checkout' && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-muted transition hover:bg-bg hover:text-ink"
            >
              &times;
            </button>
          )}
        </div>

        {/* ---------------------------------------------------------- basket */}
        {step === 'basket' && (
          <div className="px-5 py-4">
            {lines.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted">Your basket is empty.</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark"
                >
                  Start shopping
                </button>
              </div>
            ) : (
              <>
                <ul className="divide-y divide-line">
                  {lines.map((line) => (
                    <BasketLine
                      key={line.product.id}
                      line={line}
                      onQty={setQty}
                      onRemove={remove}
                    />
                  ))}
                </ul>

                <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
                  <span className="text-sm text-muted">Total</span>
                  <span className="text-xl font-medium text-accent">
                    {formatPkr(totalCents / 100)}
                  </span>
                </div>

                <p className="mt-1.5 text-[11px] text-muted">
                  Cash on delivery. Prices are confirmed when you place the
                  order.
                </p>

                <button
                  type="button"
                  onClick={() => setStep('checkout')}
                  className="mt-4 w-full rounded-xl bg-brand py-3 text-sm font-medium text-white transition hover:bg-brand-dark"
                >
                  Place order
                </button>
              </>
            )}
          </div>
        )}

        {/* -------------------------------------------------------- checkout */}
        {step === 'checkout' && (
          <form onSubmit={submit} className="px-5 py-4" noValidate>
            <Field
              label="Name"
              error={errors.customerName}
              htmlFor="customerName"
            >
              <input
                id="customerName"
                type="text"
                value={form.customerName}
                onChange={update('customerName')}
                autoComplete="name"
                className={inputClass(errors.customerName)}
              />
            </Field>

            <Field label="Phone" error={errors.phone} htmlFor="phone">
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={update('phone')}
                autoComplete="tel"
                placeholder="0300 1234567"
                className={inputClass(errors.phone)}
              />
            </Field>

            <Field label="Address" error={errors.address} htmlFor="address">
              <textarea
                id="address"
                rows={3}
                value={form.address}
                onChange={update('address')}
                autoComplete="street-address"
                placeholder="House, street, area, Noorkot"
                className={inputClass(errors.address)}
              />
            </Field>

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-sm text-muted">
                {count} {count === 1 ? 'item' : 'items'}
              </span>
              <span className="text-lg font-medium text-accent">
                {formatPkr(totalCents / 100)}
              </span>
            </div>

            {submitError && (
              <div className="mt-4">
                <Notice tone="error">
                  <strong>Could not place the order.</strong>
                  <p className="mt-1 text-[13px]">{submitError}</p>
                </Notice>
              </div>
            )}

            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => setStep('basket')}
                disabled={submitting}
                className="rounded-xl border border-line px-4 py-3 text-sm font-medium text-ink transition hover:border-brand/40 disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-brand py-3 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-60"
              >
                {submitting ? 'Placing order…' : 'Confirm order'}
              </button>
            </div>
          </form>
        )}

        {/* ------------------------------------------------------ confirmation */}
        {step === 'placed' && placed && (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted">
              We have your order. It will be delivered to
            </p>
            <p className="mx-auto mt-2 max-w-xs text-sm">{placed.address}</p>

            <p className="mt-6 text-[11px] uppercase tracking-wider text-muted">
              Order reference
            </p>
            <p className="mt-1 text-lg font-medium tracking-wide text-brand">
              {placed.order_ref}
            </p>

            <p className="mt-5 text-sm text-muted">
              {placed.itemCount} {placed.itemCount === 1 ? 'item' : 'items'}
              &middot; {formatPkr(placed.total)}
            </p>

            <p className="mt-1.5 text-[11px] text-muted">
              Pay on delivery. We will call {placed.phone} if anything changes.
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-brand py-3 text-sm font-medium text-white transition hover:bg-brand-dark"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BasketLine({ line, onQty, onRemove }) {
  const { product, qty } = line;
  const lineCents = Math.round(Number(product.price) * 100) * qty;

  return (
    <li className="flex gap-3 py-3.5">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-tint">
        {product.image_url && (
          <img
            src={product.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain p-1"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product.name}</p>
        {product.weight && (
          <p className="text-[11px] text-muted">{product.weight}</p>
        )}
        <p className="mt-0.5 text-xs text-muted">
          {formatPkr(product.price)} each
        </p>

        <div className="mt-2 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onQty(product.id, qty - 1)}
              aria-label={`Decrease quantity of ${product.name}`}
              className="h-7 w-7 rounded-full border border-line text-sm leading-none transition hover:border-brand"
            >
              &minus;
            </button>
            <span className="w-5 text-center text-sm">{qty}</span>
            <button
              type="button"
              onClick={() => onQty(product.id, qty + 1)}
              disabled={qty >= 99}
              aria-label={`Increase quantity of ${product.name}`}
              className="h-7 w-7 rounded-full border border-line text-sm leading-none transition hover:border-brand disabled:opacity-40"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={() => onRemove(product.id)}
            className="text-[11px] text-muted underline transition hover:text-accent"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-medium">{formatPkr(lineCents / 100)}</p>
      </div>
    </li>
  );
}

function Field({ label, htmlFor, error, children }) {
  return (
    <div className="mb-3.5">
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-medium text-muted"
      >
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-accent">{error}</p>}
    </div>
  );
}

function inputClass(error) {
  return [
    'w-full rounded-xl border px-3.5 py-2.5 text-base text-ink',
    'placeholder:text-muted/70 focus:outline-none focus:ring-2',
    error
      ? 'border-accent focus:ring-accent/30'
      : 'border-line focus:border-brand focus:ring-brand/20',
  ].join(' ');
}
