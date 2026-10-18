"use client";

import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "@/components/ui/Button";
import { usePolaris } from "@/lib/store";

/** XP toast after a mission, or a level-up dialog when the mission crosses a level. */
export function Celebration() {
  const celebration = usePolaris((s) => s.celebration);
  const dismiss = usePolaris((s) => s.dismissCelebration);

  // Plain XP toasts fade on their own; level-ups wait for the user.
  useEffect(() => {
    if (!celebration || celebration.levelUp) return;
    const t = setTimeout(dismiss, 3500);
    return () => clearTimeout(t);
  }, [celebration, dismiss]);

  if (!celebration) return null;

  if (celebration.levelUp) {
    return (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-surface-950/80 px-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="levelup-title"
      >
        <div
          key={celebration.id}
          className="panel relative w-full max-w-sm overflow-hidden p-8 text-center animate-rise-in"
        >
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 mx-auto size-64 rounded-full bg-star-400/25 blur-3xl" />
          <Mascot size={140} mood="happy" className="relative mx-auto animate-star-pop" />
          <p className="relative mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-star-400">Level up</p>
          <h2 id="levelup-title" className="relative mt-1 text-3xl font-bold">
            Level {celebration.levelUp.level}
          </h2>
          <p className="relative mt-1 text-lg text-starlight font-semibold">{celebration.levelUp.title}</p>
          <p className="relative mt-4 text-sm text-muted">
            {celebration.xp > 0 ? (
              <>
                You completed <span className="text-ink">{celebration.title}</span> and earned {celebration.xp} XP.
              </>
            ) : (
              <>{celebration.title}. Your business just reached a new stage!</>
            )}
          </p>
          <Button className="relative mt-7 w-full" onClick={dismiss} autoFocus>
            Keep climbing
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      key={celebration.id}
      role="status"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-surface-800/95 p-4 shadow-2xl ring-1 ring-star-400/40 backdrop-blur animate-rise-in lg:inset-x-auto lg:bottom-auto lg:right-8 lg:top-8"
    >
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br from-star-300 to-star-600">
        <Sparkles className="size-5 text-space-900" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-star-200">+{celebration.xp} XP</p>
        <p className="truncate text-xs text-muted">Mission complete: {celebration.title}</p>
      </div>
      <button onClick={dismiss} aria-label="Dismiss" className="rounded-full p-1 text-faint hover:text-ink">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
