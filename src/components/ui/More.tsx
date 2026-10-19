"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { animateHeight } from "./motion";

const toggleClass =
  "tap-target relative mt-1 inline-flex items-center gap-1 text-xs font-semibold text-star-200 transition-colors hover:text-ink";

/**
 * Text cut to a few lines, with "See more" when there's more to read. The whole text is always in
 * the page for screen readers; only what's drawn is shortened.
 */
export function Clamp({ children, lines = 2, className }: { children: ReactNode; lines?: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [cut, setCut] = useState(false);

  // Only offer "See more" when the text really runs past the limit at this width.
  useEffect(() => {
    const el = text.current;
    if (!el || open) return;
    const ro = new ResizeObserver(() => setCut(el.scrollHeight > el.clientHeight + 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  return (
    <div className={className}>
      <div ref={box}>
        <div
          ref={text}
          style={open ? undefined : { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: lines, overflow: "hidden" }}
        >
          {children}
        </div>
      </div>
      {(open || cut) && (
        <button type="button" aria-expanded={open} onClick={() => animateHeight(box.current, () => flushSync(() => setOpen(!open)))} className={toggleClass}>
          {open ? "See less" : "See more"}
          <ChevronDown className={clsx("size-3.5 transition-transform duration-200", open && "rotate-180")} aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Extra detail kept closed until asked for, opening in place below its button. */
export function SeeMore({ label = "See more", children, className }: { label?: string; children: ReactNode; className?: string }) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => animateHeight(box.current, () => flushSync(() => setOpen(!open)))}
        className={toggleClass}
      >
        {open ? "See less" : label}
        <ChevronDown className={clsx("size-3.5 transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      <div ref={box} id={id}>
        {open && <div className="pt-2">{children}</div>}
      </div>
    </div>
  );
}
