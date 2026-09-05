import { useEffect } from 'react';

// Shared behaviour for the bottom sheets (product detail, basket): Escape
// closes them, and the page behind stops scrolling.
//
// The scroll lock is not cosmetic. On mobile Safari, swiping inside a sheet
// scrolls the page underneath unless the body is pinned, which looks like the
// sheet itself is broken.
export function useDismiss(onClose) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      // Restore rather than clear, so a value set elsewhere is not clobbered.
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);
}
