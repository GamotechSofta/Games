import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Full-screen filter modal host — portals to document.body so it is not clipped
 * by dashboard scroll containers or hidden under mobile bottom nav.
 */
export default function BetHistoryFilterModalPortal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10200] flex items-center justify-center px-3 sm:px-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close filter"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
