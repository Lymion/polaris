"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Centered dialog (bottom sheet on phones). Closes on Escape and backdrop click. */
export function Modal({
  title,
  onClose,
  children,
  labelledBy = "modal-title",
}: {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  // Portal to <body>: panels use backdrop-filter, which would otherwise trap this fixed overlay inside them.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-surface-950/75 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-surface-800 p-6 shadow-2xl ring-1 ring-line animate-rise-in sm:max-w-lg sm:rounded-3xl sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-faint transition-colors hover:bg-fg/[0.08] hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </button>
        {title && (
          <h2 id={labelledBy} className="pr-8 text-xl font-bold tracking-tight">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
