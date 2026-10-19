"use client";

import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Info } from "lucide-react";
import { EASE_OUT, reducedMotion } from "./motion";

/** Once one tip has been open, the next opens at once instead of waiting for the hover delay. */
let warmUntil = 0;
const HOVER_DELAY = 350;

type Open = null | "hover" | "pinned";

/** Open/close timing shared by the info button and the tooltip. */
function useTip() {
  const [open, setOpen] = useState<Open>(null);
  const [instant, setInstant] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  function show(how: Exclude<Open, null>, now = false) {
    window.clearTimeout(timer.current);
    if (now || Date.now() < warmUntil) {
      setInstant(Date.now() < warmUntil);
      setOpen((o) => (o === "pinned" ? o : how));
    } else {
      timer.current = window.setTimeout(() => {
        setInstant(false);
        setOpen((o) => (o === "pinned" ? o : how));
      }, HOVER_DELAY);
    }
  }
  function hide(force = false) {
    window.clearTimeout(timer.current);
    setOpen((o) => {
      if (o === "pinned" && !force) return o;
      if (o) warmUntil = Date.now() + 500;
      return null;
    });
  }
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { open, instant, show, hide, setOpen };
}

/** The floating text, placed above its anchor (below when there's no room), kept on screen. */
function Bubble({ anchor, id, instant, onDismiss, children }: { anchor: HTMLElement; id: string; instant: boolean; onDismiss: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const a = anchor.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(a.left + a.width / 2 - b.width / 2, window.innerWidth - b.width - 8));
    const above = a.top - 8 - b.height >= 8;
    el.style.left = `${left}px`;
    el.style.top = `${above ? a.top - 8 - b.height : a.bottom + 8}px`;
    // Grows out of the thing it explains.
    el.style.transformOrigin = `${a.left + a.width / 2 - left}px ${above ? "100%" : "0%"}`;
    el.style.visibility = "visible";
    if (!instant) {
      el.animate(reducedMotion() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }], {
        duration: 140,
        easing: EASE_OUT,
      });
    }
  }, [anchor, instant]);

  // Anything that moves the page leaves the bubble pointing at the wrong place, so it goes.
  useEffect(() => {
    const close = () => onDismiss();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onDismiss();
    const onDown = (e: PointerEvent) => !anchor.contains(e.target as Node) && onDismiss();
    window.addEventListener("scroll", close, { capture: true, passive: true });
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("scroll", close, { capture: true });
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [anchor, onDismiss]);

  return createPortal(
    <div
      ref={ref}
      id={id}
      role="tooltip"
      style={{ visibility: "hidden" }}
      className="pointer-events-none fixed left-0 top-0 z-[95] w-max max-w-[min(18rem,calc(100vw-1rem))] rounded-xl bg-surface-700/95 px-3 py-2 text-xs leading-relaxed text-ink shadow-[0_12px_32px_-8px_rgb(0_0_0/0.5)] ring-1 ring-fg/15 backdrop-blur-xl"
    >
      {children}
    </div>,
    document.body,
  );
}

/**
 * A small ⓘ beside a heading or figure that holds the explanation: shown on hover after a beat,
 * at once on keyboard focus, and on tap (tap again, tap away or Escape to close).
 */
export function Hint({ children, label = "More about this", className }: { children: ReactNode; label?: string; className?: string }) {
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const tip = useTip();

  return (
    <>
      <button
        ref={setAnchor}
        type="button"
        aria-label={label}
        aria-expanded={tip.open === "pinned"}
        aria-describedby={tip.open ? id : undefined}
        onPointerEnter={(e) => e.pointerType === "mouse" && tip.show("hover")}
        onPointerLeave={(e) => e.pointerType === "mouse" && tip.hide()}
        onFocus={(e) => e.currentTarget.matches(":focus-visible") && tip.show("hover", true)}
        onBlur={() => tip.hide(true)}
        onClick={() => tip.setOpen((o) => (o === "pinned" ? null : "pinned"))}
        className={clsx(
          "tap-target relative -my-1 inline-grid size-5 shrink-0 place-items-center rounded-full align-middle text-faint transition-colors hover:text-ink aria-expanded:text-ink",
          className,
        )}
      >
        <Info className="size-3.5" aria-hidden />
      </button>
      {tip.open && anchor && (
        <Bubble anchor={anchor} id={id} instant={tip.instant} onDismiss={() => tip.hide(true)}>
          {children}
        </Bubble>
      )}
    </>
  );
}

type TriggerProps = {
  ref?: unknown;
  onPointerEnter?: (e: ReactPointerEvent) => void;
  onPointerLeave?: (e: ReactPointerEvent) => void;
  onPointerDown?: (e: ReactPointerEvent) => void;
  onFocus?: (e: ReactFocusEvent) => void;
  onBlur?: (e: ReactFocusEvent) => void;
  "aria-describedby"?: string;
};

function chain<E extends SyntheticEvent>(theirs: ((e: E) => void) | undefined, ours: (e: E) => void) {
  return (e: E) => {
    theirs?.(e);
    ours(e);
  };
}

/**
 * Extra words for something that already has a clear label: shown on hover and keyboard focus,
 * never needed to use it. Touch screens skip it (unless `tappable`, for a trigger that does
 * nothing else when tapped); screen readers hear it as a description.
 */
export function Tooltip({ content, tappable = false, children }: { content: ReactNode; tappable?: boolean; children: ReactElement<TriggerProps> }) {
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const tip = useTip();
  const p = children.props;

  return (
    <>
      {cloneElement(children, {
        ref: setAnchor,
        "aria-describedby": tip.open ? id : p["aria-describedby"],
        onPointerEnter: chain(p.onPointerEnter, (e) => e.pointerType === "mouse" && tip.show("hover")),
        onPointerLeave: chain(p.onPointerLeave, (e) => e.pointerType === "mouse" && tip.hide(true)),
        onPointerDown: chain(p.onPointerDown, (e) =>
          tappable && e.pointerType !== "mouse" ? tip.setOpen((o) => (o === "pinned" ? null : "pinned")) : tip.hide(true),
        ),
        onFocus: chain(p.onFocus, (e) => (e.currentTarget as HTMLElement).matches(":focus-visible") && tip.show("hover", true)),
        onBlur: chain(p.onBlur, () => tip.hide(true)),
      })}
      {tip.open && anchor && (
        <Bubble anchor={anchor} id={id} instant={tip.instant} onDismiss={() => tip.hide(true)}>
          {content}
        </Bubble>
      )}
    </>
  );
}
