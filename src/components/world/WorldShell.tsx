"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ClipboardList, LampDesk, Lock, MessagesSquare, Monitor, Package, Palette, ShieldCheck, SwatchBook } from "lucide-react";
import { PolarisMark, Wordmark } from "@/components/brand/PolarisMark";
import { ReportSales } from "@/components/levels/ReportSales";
import { MascotDock } from "@/components/mascot/MascotDock";
import { Celebration } from "@/components/shell/Celebration";
import type { WorldSpot } from "@/lib/appearance";
import { usePolaris } from "@/lib/store";
import { useLevel } from "@/lib/useLevel";

/** The places in the world, in walking order, and the spot on the desk each one is behind. */
export const ROOMS: { href: string; label: string; place: string; icon: typeof LampDesk; spot?: WorldSpot }[] = [
  { href: "/", label: "Desk", place: "Your desk", icon: LampDesk },
  { href: "/missions", label: "Board", place: "Mission board", icon: ClipboardList, spot: "board" },
  { href: "/treasury", label: "Computer", place: "Your computer", icon: Monitor, spot: "monitor" },
  { href: "/stock", label: "Stock", place: "Stockroom", icon: Package, spot: "stock" },
  { href: "/studio", label: "Studio", place: "Creative Studio", icon: Palette, spot: "easel" },
  { href: "/advisor", label: "Lumi", place: "Lumi's corner", icon: MessagesSquare },
];

export function roomFor(pathname: string) {
  return ROOMS.find((r) => (r.href === "/" ? pathname === "/" : pathname.startsWith(r.href))) ?? ROOMS[0];
}

/**
 * The interactive world's frame: a slim heads-up bar (where you are, level, appearance) and a
 * dock of rooms, instead of the classic sidebar. Each page draws its own room underneath.
 */
export function WorldShell({ onAppearance, onData, children }: { onAppearance: () => void; onData: () => void; children: ReactNode }) {
  const pathname = usePathname();
  const room = roomFor(pathname);
  const backToDesk = usePolaris((s) => s.backToDesk);

  // Next keeps the desk page alive (hidden) while you're in a room, so it can't tell on its own
  // that you've come back. The shell is always on screen, so it notes each walk back instead.
  const lastPath = useRef(pathname);
  useEffect(() => {
    const from = lastPath.current;
    lastPath.current = pathname;
    if (pathname === "/" && from !== "/") backToDesk(roomFor(from).spot ?? null);
  }, [pathname, backToDesk]);

  return (
    <div className="min-h-dvh">
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 bg-linear-to-b from-surface-950/80 to-transparent px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2" aria-label="Polaris: back to your desk">
          <PolarisMark size={30} />
          <Wordmark className="hidden text-2xl sm:block" />
        </Link>
        <span className="flex items-center gap-1.5 rounded-full bg-surface-900/75 px-3 py-1 text-xs font-semibold ring-1 ring-line backdrop-blur">
          <room.icon className="size-3.5 text-star-300" aria-hidden /> {room.place}
        </span>
        {/* gap-3 so the buttons' enlarged touch areas don't overlap */}
        <div className="ml-auto flex items-center gap-3">
          <LevelMenu />
          {[
            { label: "Your data", onClick: onData, icon: ShieldCheck },
            { label: "Appearance", onClick: onAppearance, icon: SwatchBook },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={b.onClick}
              aria-label={b.label}
              title={b.label}
              className="tap-target relative grid size-8 place-items-center rounded-full bg-surface-900/75 text-muted ring-1 ring-line backdrop-blur transition-colors hover:text-ink"
            >
              <b.icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
      </header>

      <main id="main" tabIndex={-1} className="world-main pt-14 outline-none">
        {children}
      </main>

      <nav aria-label="Rooms" className="pointer-events-none fixed inset-x-0 bottom-3 z-30 flex justify-center px-3 pb-[env(safe-area-inset-bottom)]">
        <ul className="pointer-events-auto flex gap-1 rounded-full bg-surface-900/85 p-1.5 shadow-2xl ring-1 ring-line backdrop-blur-xl">
          {ROOMS.map((r) => {
            const here = r.href === room.href;
            return (
              <li key={r.href}>
                <Link
                  href={r.href}
                  aria-current={here ? "page" : undefined}
                  className={clsx(
                    "tap-target relative flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:px-3.5",
                    here ? "bg-star-400 text-on-accent" : "text-muted hover:bg-fg/[0.08] hover:text-ink",
                  )}
                >
                  <r.icon className="size-4" aria-hidden />
                  <span className={here ? "inline" : "hidden sm:inline"}>{r.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Celebration />
      <MascotDock />
    </div>
  );
}

/** Your level in the top bar. Opens to show what the next level needs, and where to report sales. */
function LevelMenu() {
  const lvl = useLevel();
  const businessName = usePolaris((s) => s.profile.businessName);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="tap-target relative flex items-center gap-1.5 rounded-full bg-surface-900/75 px-3 py-1 text-xs font-semibold ring-1 ring-line backdrop-blur transition-shadow hover:ring-star-400/60"
      >
        <span className="text-star-300">Lv {lvl.level}</span>
        <span className="text-faint">·</span>
        <span className="text-muted">{lvl.xp.toLocaleString()} XP</span>
        {lvl.blockedByGate && <Lock className="size-3 text-star-300" aria-label="Next level locked" />}
      </button>

      {open && (
        <>
          <button type="button" aria-label="Close" className="fixed inset-0 z-0 cursor-default" onClick={() => setOpen(false)} />
          <div className="panel absolute right-0 top-10 z-10 w-72 p-4 shadow-2xl">
            <p className="truncate text-sm font-semibold" title={businessName || undefined}>
              {businessName || "Your business"}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              Level {lvl.level} · <span className="text-star-300">{lvl.title}</span>
            </p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/[0.08]">
              <div className="h-full rounded-full bg-linear-to-r from-orbit-400 to-star-400" style={{ width: `${Math.round(lvl.progress * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {!lvl.next
                ? "Max level reached."
                : lvl.blockedByGate
                  ? `You have the XP. Level ${lvl.next.level} unlocks with ${lvl.nextGate}.`
                  : `${lvl.xpToNext.toLocaleString()} XP to Level ${lvl.next.level}${lvl.nextGate ? `, which also needs ${lvl.nextGate}` : ""}.`}
            </p>
            {lvl.next && (
              <div className="mt-3">
                <ReportSales variant={lvl.blockedByGate ? "primary" : "secondary"} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
