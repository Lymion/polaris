"use client";

import { Lock } from "lucide-react";
import { ReportSales } from "@/components/levels/ReportSales";
import { Hint } from "@/components/ui/Hint";
import { EASE_OUT, Ticker } from "@/components/ui/motion";
import { MAX_LEVEL } from "@/lib/levels";
import { YourWeekCard } from "@/components/week/YourWeek";
import { DeskScene } from "@/components/world/DeskScene";
import { useHydrated, usePolaris, useWorld } from "@/lib/store";
import { useLevel } from "@/lib/useLevel";
import { BusinessStory } from "./BusinessStory";
import { MissionFocus } from "./MissionFocus";

/** Home: the business and its level, your week, the missions to do next, then the story of the business. */
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
          <h1 className="text-starlight text-[1.75rem] leading-tight font-bold tracking-tight sm:text-4xl">{profile.businessName}</h1>
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

/**
 * Level and XP toward the next one. What the next level needs waits behind the ⓘ; it comes into
 * view, with the way to report sales, only once the XP is there and sales are what's missing.
 */
function LevelCard() {
  const lvl = useLevel();
  // The next level, when its XP is reached and only the sales milestone stands in the way.
  const stuck = lvl.blockedByGate ? lvl.next : null;
  return (
    <section aria-label="Your level" className="panel relative overflow-hidden p-4 sm:p-5 xl:w-[600px] xl:shrink-0">
      <div aria-hidden className="card-glow pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-orbit-500/20 blur-3xl" />
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
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <span>
                <Ticker value={`${lvl.xp.toLocaleString()} XP`} num={lvl.xp} />
                {lvl.next && !lvl.blockedByGate && ` · ${lvl.xpToNext.toLocaleString()} to Level ${lvl.next.level}`}
              </span>
              {lvl.next && !lvl.blockedByGate && (
                <Hint label={`What Level ${lvl.next.level} needs`}>
                  Level {lvl.next.level} · {lvl.next.title} needs {lvl.next.xp.toLocaleString()} XP and {lvl.nextGate}. Sales you log in
                  Treasury count toward it.
                </Hint>
              )}
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-fg/[0.08]">
            <div
              className="h-full rounded-full bg-linear-to-r from-orbit-400 to-star-400 transition-[width] duration-700"
              style={{ width: `${Math.max(4, Math.round(lvl.progress * 100))}%`, transitionTimingFunction: EASE_OUT }}
            />
          </div>
        </div>
      </div>

      {stuck && (
        // Wraps: on a phone the button drops under the sentence instead of squeezing it into a column.
        <div className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <Lock className="size-4 shrink-0 text-star-300" aria-hidden />
          <p className="min-w-[13rem] flex-1 text-xs leading-snug text-muted">
            You have the XP for <span className="font-semibold text-ink">Level {stuck.level}</span>. Unlock it by reaching{" "}
            <span className="font-semibold text-star-200">{lvl.nextGate}</span>.
          </p>
          <ReportSales variant="primary" />
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
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="h-72 animate-pulse rounded-[1.25rem] bg-fg/[0.04] xl:col-span-3" />
        <div className="h-72 animate-pulse rounded-[1.25rem] bg-fg/[0.04] xl:col-span-2" />
      </div>
      <div className="h-40 animate-pulse rounded-[1.25rem] bg-fg/[0.04]" />
    </div>
  );
}
