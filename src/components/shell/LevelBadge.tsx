"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useHydrated, usePolaris } from "@/lib/store";
import { useLevel } from "@/lib/useLevel";

/** Level and XP: a full card in the sidebar, or a compact chip in the top bars. */
export function LevelBadge({ compact = false }: { compact?: boolean }) {
  const hydrated = useHydrated();
  const businessName = usePolaris((s) => s.profile.businessName);
  const lvl = useLevel();

  if (!hydrated) return <div className={compact ? "h-7 w-20" : "h-[92px]"} />;

  if (compact) {
    return (
      <Link
        href="/"
        className="flex items-center gap-1.5 rounded-full bg-surface-900/75 px-3 py-1 text-xs font-semibold ring-1 ring-line backdrop-blur"
      >
        <span className="text-star-300">Lv {lvl.level}</span>
        <span className="text-faint">·</span>
        <span className="text-muted">{lvl.xp.toLocaleString()} XP</span>
        {lvl.blockedByGate && <Lock className="size-3 text-star-300" aria-label="Next level locked" />}
      </Link>
    );
  }

  return (
    <Link href="/" className="panel block p-4 transition-colors hover:bg-fg/[0.06]">
      <p className="truncate text-sm font-semibold">{businessName || "Your business"}</p>
      <p className="mt-0.5 text-xs text-muted">
        Level {lvl.level} · <span className="text-star-300">{lvl.title}</span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/[0.08]">
        <div
          className="h-full rounded-full bg-linear-to-r from-orbit-400 to-star-400 transition-[width] duration-700"
          style={{ width: `${Math.round(lvl.progress * 100)}%` }}
        />
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-xs text-faint">
        {lvl.blockedByGate ? (
          <>
            <Lock className="size-3 shrink-0 text-star-300" aria-hidden /> Needs {lvl.nextGate}
          </>
        ) : lvl.next ? (
          `${lvl.xpToNext.toLocaleString()} XP to Level ${lvl.next.level}`
        ) : (
          "Max level reached"
        )}
      </p>
    </Link>
  );
}
