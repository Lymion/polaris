"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePolaris, useWorld } from "@/lib/store";
import { StockBoxesArt } from "./DeskProps";

function BackToDesk() {
  return (
    <Link
      href="/"
      className="world-wood absolute left-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-white shadow-lg hover:brightness-110 sm:left-[3%]"
    >
      <ArrowLeft className="size-3.5" aria-hidden /> Back to your desk
    </Link>
  );
}

/** A strip of floor under the room, so it stands on something. The dock sits over it. */
function Floor() {
  return <div className="world-floor absolute inset-x-0 bottom-0 h-24" aria-hidden />;
}

/**
 * Missions in the world: you've walked up to the mission board. The page sits on cork, and every
 * card on it is a pinned paper note.
 */
export function BoardRoom({ children }: { children: ReactNode }) {
  const world = useWorld();
  if (!world) return <>{children}</>;

  return (
    <div className="world-wall world-enter relative min-h-[calc(100dvh-3.5rem)] px-3 pb-24 pt-12 sm:px-[3%]">
      <BackToDesk />
      <Floor />
      <div className="world-frame world-cork board-scope relative z-10 mx-auto h-[calc(100dvh-11rem)] min-h-[420px] max-w-7xl overflow-hidden rounded-lg">
        <div className="h-full overflow-y-auto px-4 pb-10 pt-6 sm:px-8">{children}</div>
      </div>
    </div>
  );
}

/** Treasury in the world: you're leaning into the computer. The page runs inside its screen. */
export function ComputerRoom({ children }: { children: ReactNode }) {
  const world = useWorld();
  const businessName = usePolaris((s) => s.profile.businessName);
  if (!world) return <>{children}</>;

  return (
    <div className="world-wall world-enter relative min-h-[calc(100dvh-3.5rem)] overflow-hidden px-3 pb-24 pt-12 sm:px-[3%]">
      <BackToDesk />
      <div className="world-desk absolute inset-x-0 bottom-0 h-28" aria-hidden />
      <div className="absolute bottom-[4.5rem] left-1/2 z-0 h-16 w-24 -translate-x-1/2 bg-linear-to-b from-[#1f2937] to-[#0b1020]" aria-hidden />
      <div className="world-bezel relative z-10 mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-lg bg-surface-950 ring-1 ring-black/40">
          <div className="flex items-center gap-1.5 border-b border-line bg-surface-900 px-4 py-2">
            <span className="size-2.5 rounded-full bg-[#f87171]" />
            <span className="size-2.5 rounded-full bg-[#fbbf24]" />
            <span className="size-2.5 rounded-full bg-[#4ade80]" />
            <span className="ml-3 truncate text-xs font-semibold text-muted" title={businessName}>
              Treasury · {businessName}
            </span>
          </div>
          <div className="h-[calc(100dvh-14.5rem)] min-h-[380px] overflow-y-auto px-4 pb-10 pt-6 sm:px-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stock in the world: the stockroom the boxes by your desk come from. The page sits in a wooden
 * shelving unit, with more boxes stacked on the floor either side when there's room.
 */
export function StockRoom({ children }: { children: ReactNode }) {
  const world = useWorld();
  if (!world) return <>{children}</>;

  return (
    <div className="world-wall world-enter relative min-h-[calc(100dvh-3.5rem)] overflow-hidden px-3 pb-24 pt-12 sm:px-[3%]">
      <BackToDesk />
      <Floor />
      <StockBoxesArt className="absolute bottom-12 left-[0.5%] hidden h-[240px] w-[180px] xl:block" />
      <StockBoxesArt className="absolute bottom-12 right-[0.5%] hidden h-[200px] w-[150px] -scale-x-100 xl:block" />
      <div className="world-frame world-shelf-back relative z-10 mx-auto h-[calc(100dvh-11rem)] min-h-[420px] max-w-7xl overflow-hidden rounded-lg">
        <div className="h-full overflow-y-auto px-4 pb-10 pt-6 sm:px-8">{children}</div>
      </div>
    </div>
  );
}

/** The Creative Studio in the world: through the door from your desk. */
export function StudioDoorway({ children }: { children: ReactNode }) {
  const world = useWorld();
  if (!world) return <>{children}</>;

  return (
    <div className="world-enter relative mx-auto w-full max-w-6xl px-4 pb-28 pt-12 sm:px-6">
      <BackToDesk />
      {children}
    </div>
  );
}

/** Lumi's corner: a quiet nook with bookshelves for talking things through. */
export function NookRoom({ children }: { children: ReactNode }) {
  const world = useWorld();
  if (!world) return <>{children}</>;

  return (
    <div className="world-wall world-enter relative min-h-[calc(100dvh-3.5rem)] overflow-hidden px-4 pb-28 pt-12">
      <BackToDesk />
      <Floor />
      <Shelf className="left-[2%]" />
      <Shelf className="right-[2%]" />
      <div className="relative z-10 mx-auto max-w-3xl">{children}</div>
    </div>
  );
}

function Shelf({ className }: { className: string }) {
  const colors = ["#F5B942", "#3B6FE0", "#EC4899", "#22C55E", "#A78BFA", "#EEF2FF"];
  return (
    <div className={`world-wood absolute bottom-24 hidden h-[62%] w-[12%] rounded-t-md p-2 xl:block ${className}`} aria-hidden>
      {[0, 1, 2, 3].map((shelf) => (
        <div key={shelf} className="flex h-1/4 items-end gap-1 border-b-[6px] border-black/25 px-1">
          {Array.from({ length: 5 }, (_, k) => (
            <span
              key={k}
              className="w-[14%] rounded-t-sm"
              style={{ height: `${55 + ((k * 7 + shelf * 3) % 4) * 10}%`, backgroundColor: colors[(k + shelf * 2) % colors.length] }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
