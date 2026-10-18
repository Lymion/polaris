"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { TrendingDown, TrendingUp, X } from "lucide-react";

// The tap-through story format that Month Wrapped and Your Week share: full screen, a progress
// bar per slide, tap to move on, hold to pause, like Stories.

export interface Slide {
  id: string;
  /** Background gradient for the slide. */
  bg: string;
  /** How long the slide stays up before moving on by itself; 0 waits for a tap. */
  ms: number;
  body: ReactNode;
}

export function useReducedMotion() {
  const [reduced] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  return reduced;
}

/** Counts up to `value`, writing straight to the DOM (no re-render per frame). */
export function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  // Kept in a ref so a re-render (e.g. pausing) doesn't restart the count.
  const formatRef = useRef(format);
  useEffect(() => {
    formatRef.current = format;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = formatRef.current(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1300);
      el.textContent = formatRef.current(value * (1 - (1 - p) ** 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return <span ref={ref} className={className}>{format(0)}</span>;
}

/** Staggered entrance for slide content. */
export function Pop({ i, children, className }: { i: number; children: ReactNode; className?: string }) {
  return (
    <div className={clsx("wrapped-pop", className)} style={{ animationDelay: `${150 + i * 220}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

/** "+12% vs September", green or red depending on whether up is good. */
export function Delta({ now, before, upIsGood, vs }: { now: number; before: number | undefined; upIsGood: boolean; vs?: string }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / Math.abs(before)) * 100);
  const good = pct === 0 ? null : pct > 0 === upIsGood;
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold",
        good === null ? "bg-fg/15" : good ? "bg-growth/20 text-growth" : "bg-alert/20 text-alert",
      )}
    >
      {pct >= 0 ? <TrendingUp className="size-4" aria-hidden /> : <TrendingDown className="size-4" aria-hidden />}
      {pct > 0 ? "+" : ""}
      {pct}% vs {vs}
    </span>
  );
}

/** Mini columns, the last one highlighted and labelled with its value. */
export function Columns({ values, labels, color, format }: { values: number[]; labels: string[]; color: string; format: (n: number) => string }) {
  const max = Math.max(...values.map(Math.abs), 1);
  return (
    <div className="flex h-36 items-end justify-center gap-3" role="img" aria-label={labels.map((l, i) => `${l}: ${format(values[i])}`).join(", ")}>
      {values.map((v, i) => {
        const last = i === values.length - 1;
        return (
          <div key={labels[i]} className="flex w-12 flex-col items-center gap-1.5">
            {last && <span className="text-xs font-semibold tabular-nums">{format(v)}</span>}
            <div
              className="w-6 origin-bottom rounded-t-[4px] wrapped-pop"
              style={{ height: `${Math.max(3, (Math.abs(v) / max) * 100)}px`, background: v < 0 ? "#F87171" : color, opacity: last ? 1 : 0.45, animationDelay: `${400 + i * 90}ms` }}
            />
            <span className={clsx("whitespace-nowrap text-[11px]", last ? "font-semibold text-ink" : "text-fg/60")}>{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Plays a story full screen. `slides` gets `restart` for a "Watch again" button on the last
 * slide. Buttons inside a slide need `data-no-advance` so tapping them doesn't turn the page.
 */
export function StoryPlayer({ label, slides: make, onClose }: { label: string; slides: (restart: () => void) => Slide[]; onClose: () => void }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  const slides = make(() => setIndex(0));
  const slide = slides[Math.min(index, slides.length - 1)];
  const last = index >= slides.length - 1;
  const count = slides.length;
  const next = () => setIndex((i) => Math.min(count - 1, i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setIndex((i) => Math.min(count - 1, i + 1));
      } else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, count]);

  // Tap left third to go back, the rest to go forward. Press and hold pauses (like Stories).
  function onPointerDown() {
    held.current = false;
    holdTimer.current = setTimeout(() => {
      held.current = true;
      setPaused(true);
    }, 220);
  }
  function onPointerUp(e: ReactPointerEvent) {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (held.current) {
      setPaused(false);
      return;
    }
    if ((e.target as HTMLElement).closest("[data-no-advance]")) return;
    const x = e.clientX / window.innerWidth;
    if (x < 0.33) prev();
    else next();
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-roledescription="story"
      aria-label={`${label}, slide ${index + 1} of ${slides.length}`}
      className={clsx("scope-dark fixed inset-0 z-[80] select-none overflow-hidden bg-linear-to-br text-white transition-colors duration-700", slide.bg, paused && "wrapped-paused")}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setPaused(false)}
    >
      <div aria-hidden className="wrapped-drift pointer-events-none absolute -left-1/4 top-0 size-[70vmax] rounded-full bg-fg/[0.06] blur-3xl" />

      <div className="absolute inset-x-0 top-0 z-10 flex gap-1.5 px-4 pt-4">
        {slides.map((s, i) => (
          <div key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-fg/25">
            {i < index && <div className="h-full bg-white" />}
            {i === index &&
              (reduced || !s.ms ? (
                <div className="h-full bg-white" />
              ) : (
                <div
                  key={`${s.id}-${index}`}
                  className="wrapped-progress h-full bg-white"
                  style={{ "--slide-ms": `${s.ms}ms` } as CSSProperties}
                  onAnimationEnd={next}
                />
              ))}
          </div>
        ))}
      </div>

      <button
        type="button"
        data-no-advance
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-8 z-10 grid size-10 place-items-center rounded-full bg-black/20 hover:bg-black/40"
      >
        <X className="size-5" aria-hidden />
      </button>

      <div key={slide.id} className="relative mx-auto flex h-full max-w-xl flex-col justify-center overflow-y-auto px-6 pb-12 pt-20">
        {slide.body}
      </div>

      {!last && (
        <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-xs text-fg/50">
          Tap to continue · hold to pause
        </p>
      )}
    </div>,
    document.body,
  );
}
