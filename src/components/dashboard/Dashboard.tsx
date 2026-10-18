"use client";

import clsx from "clsx";
import { Lock } from "lucide-react";
import { ReportSales } from "@/components/levels/ReportSales";
import { MAX_LEVEL } from "@/lib/levels";
import { YourWeekCard } from "@/components/week/YourWeek";
import { DeskScene } from "@/components/world/DeskScene";
import { useHydrated, usePolaris, useWorld } from "@/lib/store";
import { useLevel } from "@/lib/useLevel";
import { BusinessStory } from "./BusinessStory";
import { MissionFocus } from "./MissionFocus";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Home: who you are and your level, your week, the missions to do next, then the story of the business. */
export function Dashboard() {
  const hydrated = useHydrated();
  const profile = usePolaris((s) => s.profile);
  const world = useWorld();

  if (!hydrated || !profile.onboarded) return <DashboardSkeleton />;
  if (world) return <DeskScene />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <section className="min-w-0">
          {/* The owner's name in the greeting and the business as the heading, so two long names
              don't stack into one five-line headline on a phone. */}
          <p className="text-sm text-muted">
            {greeting()}, <span className="font-medium text-ink">{profile.ownerName}</span>
          </p>
          <h1 className="text-starlight mt-1 text-[1.75rem] leading-tight font-bold tracking-tight sm:text-4xl">{profile.businessName}</h1>
          <p className="mt-2 text-sm text-muted">
            Current goal: <span className="font-medium text-ink">{profile.goal}</span>
          </p>
        </section>
        <LevelCard />
      </div>

      <YourWeekCard />
      <MissionFocus />
      <BusinessStory />
    </div>
  );
}

/** Level, XP toward the next one, and what unlocks it. */
function LevelCard() {
  const lvl = useLevel();
  return (
    <section aria-label="Your level" className="panel relative overflow-hidden p-4 sm:p-5 xl:w-[600px] xl:shrink-0">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-orbit-500/20 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-star-300 to-star-600 text-xl font-extrabold text-on-accent shadow-[0_8px_24px_-8px_var(--accent-glow)]">
          {lvl.level}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="min-w-0">
              <span className="eyebrow text-star-400">
                Level {lvl.level} of {MAX_LEVEL}
              </span>{" "}
              <span className="font-bold">{lvl.title}</span>
            </p>
            <p className="text-xs text-muted">
              {lvl.xp.toLocaleString()} XP
              {lvl.next && !lvl.blockedByGate && ` · ${lvl.xpToNext.toLocaleString()} to Level ${lvl.next.level}`}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-fg/[0.08]">
            <div
              className="h-full rounded-full bg-linear-to-r from-orbit-400 to-star-400 transition-[width] duration-700"
              style={{ width: `${Math.max(4, Math.round(lvl.progress * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {lvl.next && (
        // Wraps: on a phone the button drops under the sentence instead of squeezing it into a column.
        <div className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <Lock className={clsx("size-4 shrink-0", lvl.blockedByGate ? "text-star-300" : "text-faint")} aria-hidden />
          <p className="min-w-[13rem] flex-1 text-xs leading-snug text-muted">
            {lvl.blockedByGate ? (
              <>
                You have the XP for <span className="font-semibold text-ink">Level {lvl.next.level}</span>. Unlock it by reaching{" "}
                <span className="font-semibold text-star-200">{lvl.nextGate}</span>.
              </>
            ) : (
              <>
                Level {lvl.next.level} · <span className="text-ink">{lvl.next.title}</span> needs {lvl.next.xp.toLocaleString()} XP and{" "}
                <span className="text-ink">{lvl.nextGate}</span>.
              </>
            )}
          </p>
          <ReportSales variant={lvl.blockedByGate ? "primary" : "secondary"} />
        </div>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="flex flex-col gap-5 xl:flex-row xl:justify-between">
        <div className="h-24 w-full max-w-md animate-pulse rounded-2xl bg-fg/[0.04]" />
        <div className="h-28 w-full animate-pulse rounded-[1.25rem] bg-fg/[0.04] xl:w-[600px]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-72 animate-pulse rounded-[1.25rem] bg-fg/[0.04] lg:col-span-3" />
        <div className="h-72 animate-pulse rounded-[1.25rem] bg-fg/[0.04] lg:col-span-2" />
      </div>
      <div className="h-40 animate-pulse rounded-[1.25rem] bg-fg/[0.04]" />
    </div>
  );
}
