"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode, type RefObject } from "react";
import clsx from "clsx";

/** A strong ease-out: quick to respond, soft to settle. */
export const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Text that ticks when its value changes: the new value rises into place (or drops, when the
 * number went down) with a brief glow, so a total that just updated catches the eye. Nothing
 * moves on the first render.
 */
export function Ticker({ value, num, className }: { value: string; num?: number; className?: string }) {
  const [shown, setShown] = useState({ value, num, n: 0, down: false });
  if (shown.value !== value) {
    setShown({ value, num, n: shown.n + 1, down: num !== undefined && shown.num !== undefined && num < shown.num });
  }
  return (
    <span key={shown.n} className={clsx("inline-block", shown.n > 0 && (shown.down ? "animate-tick-down" : "animate-tick-up"), className)}>
      {value}
    </span>
  );
}

type Ghost<T> = { key: string; item: T; index: number };

/**
 * Keeps items that just left a list on screen long enough to animate out, and marks the ones that
 * just arrived so they can animate in. Items that were there on the first render don't animate.
 */
export function usePresence<T>(items: T[], getKey: (item: T) => string) {
  const keys = items.map(getKey);
  const sig = keys.join("\u0000");
  const [last, setLast] = useState({ sig, items });
  const [ghosts, setGhosts] = useState<Ghost<T>[]>([]);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(() => new Set());

  // Compared by keys, not by array: callers usually rebuild the list on every render. (So an item
  // that leaves animates out as it looked when the list last changed.)
  if (sig !== last.sig) {
    const now = new Set(keys);
    const before = new Set(last.items.map(getKey));
    const gone = last.items.flatMap((item, index) => (now.has(getKey(item)) ? [] : [{ key: getKey(item), item, index }]));
    setGhosts((g) => [...g.filter((x) => !now.has(x.key) && !gone.some((y) => y.key === x.key)), ...gone]);
    setFresh(new Set(keys.filter((k) => !before.has(k))));
    setLast({ sig, items });
  }

  const list: { key: string; item: T; state: "staying" | "entering" | "leaving" }[] = items.map((item) => {
    const key = getKey(item);
    return { key, item, state: fresh.has(key) ? "entering" : "staying" };
  });
  for (const g of [...ghosts].sort((a, b) => a.index - b.index)) {
    if (!list.some((x) => x.key === g.key)) list.splice(Math.min(g.index, list.length), 0, { key: g.key, item: g.item, state: "leaving" });
  }

  return { list, settle: (key: string) => setGhosts((g) => g.filter((x) => x.key !== key)) };
}

function heightKeyframes(el: HTMLElement) {
  const cs = getComputedStyle(el);
  return {
    height: `${el.offsetHeight}px`,
    marginBlockStart: cs.marginBlockStart,
    marginBlockEnd: cs.marginBlockEnd,
    paddingBlockStart: cs.paddingBlockStart,
    paddingBlockEnd: cs.paddingBlockEnd,
  };
}

const COLLAPSED = { height: "0px", marginBlockStart: "0px", marginBlockEnd: "0px", paddingBlockStart: "0px", paddingBlockEnd: "0px" };

/**
 * One list item that grows in when it arrives and folds away when it leaves, so the items around
 * it slide into place instead of jumping. `fade` is for table rows, which can't fold.
 *
 * `glow` is how a new item is marked so the eye finds it: "flash" tints a row's background, "ring"
 * outlines a card (or, given a selector, the card inside a wider row), false for short lists where
 * arriving is enough.
 */
export function PresenceItem({
  as: Tag = "li",
  state,
  onSettled,
  fade = false,
  glow = "flash",
  className,
  style,
  children,
}: {
  as?: ElementType;
  state: "staying" | "entering" | "leaving";
  onSettled: () => void;
  fade?: boolean;
  glow?: false | "flash" | "ring" | `ring:${string}`;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const settled = useRef(onSettled);
  useLayoutEffect(() => {
    settled.current = onSettled;
  });

  // Arriving: grow from nothing, then glow once so the eye finds it.
  useLayoutEffect(() => {
    const el = ref.current;
    if (state !== "entering" || !el) return;
    if (reducedMotion()) {
      el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
      return;
    }
    const full = heightKeyframes(el);
    const grow = fade
      ? el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: "ease-out" })
      : el.animate([{ ...COLLAPSED, opacity: 0, overflow: "hidden" }, { ...full, opacity: 1, overflow: "hidden" }], { duration: 320, easing: EASE_OUT });
    let shine: Animation | undefined;
    if (glow === "flash") {
      shine = el.animate(
        [{ backgroundColor: "color-mix(in oklab, var(--color-star-400) 16%, transparent)" }, { backgroundColor: "transparent" }],
        { duration: 1600, delay: 150, easing: "ease-out" },
      );
    } else if (glow) {
      const lit = glow === "ring" ? el : el.querySelector<HTMLElement>(glow.slice(5));
      shine = lit?.animate(
        [
          { outline: "2px solid color-mix(in oklab, var(--color-focus) 75%, transparent)", outlineOffset: "2px" },
          { outline: "2px solid transparent", outlineOffset: "2px" },
        ],
        { duration: 1400, delay: 200, easing: "ease-out" },
      );
    }
    return () => {
      grow.cancel();
      shine?.cancel();
    };
    // Mount only: an item animates in once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Leaving: fade first, then fold the space shut.
  useLayoutEffect(() => {
    const el = ref.current;
    if (state !== "leaving" || !el) return;
    if (!el.getClientRects().length) return settled.current();
    const anim = reducedMotion()
      ? el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: "forwards" })
      : fade
        ? el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-out", fill: "forwards" })
        : el.animate(
            [
              { ...heightKeyframes(el), opacity: 1, transform: "scale(1)", overflow: "hidden" },
              { opacity: 0, transform: "scale(0.98)", offset: 0.45 },
              { ...COLLAPSED, opacity: 0, transform: "scale(0.98)", overflow: "hidden" },
            ],
            { duration: 380, easing: EASE_OUT, fill: "forwards" },
          );
    anim.onfinish = () => settled.current();
    return () => anim.cancel();
  }, [state, fade]);

  return (
    <Tag ref={ref} className={className} style={style} inert={state === "leaving" || undefined} aria-hidden={state === "leaving" || undefined}>
      {children}
    </Tag>
  );
}

/**
 * When a sorted list changes order, each item glides from where it was to where it is now instead
 * of jumping. Items are the container's children marked `data-flip={key}`; `order` is their keys in
 * order, so it only runs when the order really changed.
 */
export function useReorder(container: RefObject<HTMLElement | null>, order: string) {
  const last = useRef({ order, tops: new Map<string, number>() });
  // Positions are noted after every render, so a later move starts from where things really were.
  useLayoutEffect(() => {
    const el = container.current;
    if (!el) return;
    const items = [...el.querySelectorAll<HTMLElement>(":scope > [data-flip]")];
    const tops = new Map(items.map((item) => [item.dataset.flip!, item.offsetTop]));
    if (order !== last.current.order && !reducedMotion()) {
      for (const item of items) {
        const before = last.current.tops.get(item.dataset.flip!);
        const shift = before === undefined ? 0 : before - tops.get(item.dataset.flip!)!;
        if (Math.abs(shift) > 1) item.animate([{ transform: `translateY(${shift}px)` }, { transform: "none" }], { duration: 420, easing: EASE_OUT });
      }
    }
    last.current = { order, tops };
  });
}

/**
 * Animates a block's height between two states: measure, change, measure, then play the
 * difference. Starting from the current on-screen height means a second tap mid-way reverses
 * smoothly instead of jumping.
 */
export function animateHeight(el: HTMLElement | null, change: () => void) {
  if (!el || reducedMotion()) return change();
  const from = el.getBoundingClientRect().height;
  for (const a of el.getAnimations()) a.cancel();
  change();
  const to = el.getBoundingClientRect().height;
  if (Math.abs(to - from) < 1) return;
  el.animate([{ height: `${from}px`, overflow: "hidden" }, { height: `${to}px`, overflow: "hidden" }], { duration: 300, easing: EASE_OUT });
}
