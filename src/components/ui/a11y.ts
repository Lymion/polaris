"use client";

import { useEffect, type KeyboardEvent, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * For a dialog: moves focus into it when it opens (unless a child already took it with autoFocus),
 * keeps Tab inside it, and hands focus back to whatever had it before when it closes. The dialog
 * element needs tabIndex={-1}.
 */
export function useDialogFocus(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const at = document.activeElement;
      if (e.shiftKey && (at === first || at === dialog || !dialog.contains(at))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (at === last || !dialog.contains(at))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (before?.isConnected) before.focus({ preventScroll: true });
    };
  }, [ref]);
}

const STEPS: Record<string, (i: number, last: number) => number> = {
  ArrowRight: (i) => i + 1,
  ArrowDown: (i) => i + 1,
  ArrowLeft: (i) => i - 1,
  ArrowUp: (i) => i - 1,
  Home: () => 0,
  End: (_, last) => last,
};

/**
 * onKeyDown for a tablist or radiogroup: the arrow keys (and Home and End) move between its tabs or
 * options and pick the one they land on, as keyboard and screen reader users expect from those
 * roles. Give the selected option tabIndex={0} and the rest -1, so Tab enters the group once.
 */
export function rovingKeys(e: KeyboardEvent<HTMLElement>) {
  const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"], [role="radio"]')].filter((el) => !el.disabled);
  const i = items.indexOf(document.activeElement as HTMLButtonElement);
  const step = STEPS[e.key];
  if (i < 0 || !step) return;
  e.preventDefault();
  const item = items[(step(i, items.length - 1) + items.length) % items.length];
  item.focus();
  item.click();
}
