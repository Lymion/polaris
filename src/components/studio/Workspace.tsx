"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { ArrowLeft, CalendarDays, Clapperboard, LibraryBig, Megaphone, Palette, type LucideIcon } from "lucide-react";
import { Mascot, type MascotMood } from "@/components/mascot/Mascot";
import { mascotName, usePolaris } from "@/lib/store";
import { STATIONS, type StationId } from "@/lib/studio";

export const STATION_ICONS: Record<StationId, LucideIcon> = {
  brand: Palette,
  campaign: Megaphone,
  video: Clapperboard,
  calendar: CalendarDays,
  library: LibraryBig,
};

export interface StationNav {
  onBack: () => void;
  onSwitch: (id: StationId) => void;
}

export interface LumiLine {
  mood: MascotMood;
  text: string;
}

/** A station up close: back to the room, the station's name, and Lumi standing beside you. */
export function WorkspaceFrame({
  station,
  lumi,
  nav,
  children,
}: {
  station: StationId;
  lumi: LumiLine;
  nav: StationNav;
  children: ReactNode;
}) {
  const meta = STATIONS.find((s) => s.id === station)!;
  const Icon = STATION_ICONS[station];
  const name = usePolaris((s) => mascotName(s.profile));
  const openMascot = usePolaris((s) => s.openMascot);

  return (
    <section data-station={station} aria-labelledby="station-title" className="studio-set studio-enter px-4 pb-14 pt-4 sm:px-7 sm:pt-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={nav.onBack}
          className="inline-flex items-center gap-2 rounded-full bg-fg/[0.08] px-3.5 py-2 text-sm font-semibold ring-1 ring-line transition-colors hover:bg-fg/[0.14]"
        >
          <ArrowLeft className="size-4" aria-hidden /> Studio
        </button>
        <nav aria-label="Stations" className="ml-auto flex gap-1 rounded-full bg-black/20 p-1 ring-1 ring-line">
          {STATIONS.map((s) => {
            const StationIcon = STATION_ICONS[s.id];
            const here = s.id === station;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => !here && nav.onSwitch(s.id)}
                aria-label={s.name}
                aria-current={here ? "page" : undefined}
                title={s.name}
                className={clsx(
                  "grid size-8 place-items-center rounded-full transition-colors sm:size-9",
                  here ? "bg-star-400 text-on-accent" : "text-muted hover:bg-fg/[0.1] hover:text-ink",
                )}
              >
                <StationIcon className="size-4" aria-hidden />
              </button>
            );
          })}
        </nav>
      </div>

      <header className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-orbit-500 to-surface-700 ring-1 ring-fg/10">
            <Icon className="size-6 text-star-300" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-star-400">Creative Studio</p>
            <h1 id="station-title" className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {meta.name}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{meta.blurb}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 lg:max-w-md">
          <button
            type="button"
            onClick={() => openMascot()}
            aria-label={`Ask ${name}`}
            title={`Ask ${name}`}
            className="shrink-0 rounded-full transition-transform hover:scale-105 active:scale-95"
          >
            <Mascot size={80} mood={lumi.mood} greet />
          </button>
          <p
            aria-live="polite"
            className="relative rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[13px] leading-snug text-space-900 shadow-xl"
          >
            {lumi.text}
          </p>
        </div>
      </header>

      <div className="mt-8">{children}</div>
    </section>
  );
}

/** Placeholder blocks while Lumi works. */
export function Sketching({ label, tone = "dark" }: { label: string; tone?: "dark" | "light" }) {
  const bar = tone === "light" ? "bg-space-900/10" : "bg-fg/[0.07]";
  return (
    <div role="status" className="space-y-3">
      <p className={clsx("text-sm font-semibold", tone === "light" ? "text-space-700" : "text-star-200")}>{label}</p>
      {[92, 76, 84, 58].map((w, i) => (
        <div key={i} className={clsx("h-4 animate-pulse rounded-full", bar)} style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}
