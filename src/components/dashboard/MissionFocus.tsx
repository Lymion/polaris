"use client";

import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, CheckCircle2, ChevronRight, Target, TrendingUp, Trophy } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { CATEGORY_LABELS, CATEGORY_STYLES, FOUNDATIONS } from "@/lib/categories";
import { mascotName, usePolaris } from "@/lib/store";
import type { Foundation, Mission } from "@/lib/types";
import { useLevel } from "@/lib/useLevel";
import { CardTitle, Stat } from "./parts";

/** The mission to show first: one ready to report, then one under way, then the next to start. */
export function pickNext(open: Mission[]) {
  const stepsDone = (m: Mission) => m.steps.filter((s) => s.done).length;
  return (
    open.find((m) => m.steps.length > 0 && stepsDone(m) === m.steps.length) ??
    open.find((m) => stepsDone(m) > 0) ??
    open.find((m) => m.status === "active") ??
    open[0]
  );
}

/** Up next: the one mission to work on now, what follows, and how far the business basics are. */
export function MissionFocus() {
  const profile = usePolaris((s) => s.profile);
  const missions = usePolaris((s) => s.missions);

  const open = missions.filter((m) => m.status !== "done");
  const done = missions.filter((m) => m.status === "done");
  const featured = pickNext(open);
  const queue = open.filter((m) => m !== featured).slice(0, 3);
  const xpWaiting = open.reduce((sum, m) => sum + m.xp, 0);

  // Basics count as in place when ticked off, or set up by a finished mission; "planned" when an
  // open mission covers them.
  const inPlace = new Set<Foundation>([...(profile.foundations ?? []), ...done.flatMap((m) => m.foundations ?? [])]);
  const planned = new Set<Foundation>(open.flatMap((m) => m.foundations ?? []).filter((f) => !inPlace.has(f)));
  const missing = FOUNDATIONS.filter((f) => !inPlace.has(f.id));

  return (
    // Side by side from xl: at lg the sidebar leaves the right card too narrow for its labels.
    <div className="grid gap-6 xl:grid-cols-5">
      <section className="panel relative overflow-hidden p-5 sm:p-6 xl:col-span-3">
        <div aria-hidden className="pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-star-400/10 blur-3xl" />
        <CardTitle icon={Target} title="Up next" href="/missions" />
        {featured ? (
          <>
            <FeaturedMission mission={featured} />
            {queue.length > 0 && (
              <>
                <p className="relative mt-6 eyebrow text-faint">Then</p>
                <ul className="relative mt-2 space-y-2">
                  {queue.map((m) => (
                    <li key={m.id}>
                      <Link
                        href="/missions"
                        className="flex items-center gap-3 rounded-xl bg-fg/[0.03] px-4 py-2.5 ring-1 ring-line transition-colors hover:bg-fg/[0.06] pointer-coarse:py-3"
                      >
                        <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", CATEGORY_STYLES[m.category])}>
                          {CATEGORY_LABELS[m.category]}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={m.title}>
                          {m.title}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-star-300">+{m.xp} XP</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <div className="relative mt-4 rounded-xl border border-dashed border-fg/10 p-5">
            <div className="flex items-start gap-4">
              <Trophy className="size-8 shrink-0 text-orbit-400/70" aria-hidden />
              <p className="text-sm leading-relaxed text-muted">
                {done.length
                  ? `Every mission is done. Nice work! ${mascotName(profile)} can plan the next ones toward your goal.`
                  : `No missions yet. ${mascotName(profile)} will chart your first questline: your business basics first, then your goal.`}
              </p>
            </div>
            <ButtonLink href="/missions" size="sm" className="mt-4">
              {done.length ? "Plan my next missions" : "Get my first missions"}
            </ButtonLink>
          </div>
        )}
      </section>

      <section className="panel p-5 sm:p-6 xl:col-span-2">
        <CardTitle icon={Trophy} title="Mission progress" href="/missions" />
        {/* On a small phone the columns size to their labels, so "In progress" fits on one line. */}
        <dl className="mt-4 grid grid-cols-[repeat(3,auto)] justify-between gap-3 sm:grid-cols-3">
          <Stat label="Done" value={String(done.length)} />
          <Stat label="In progress" value={String(open.length)} />
          <Stat label="XP waiting" value={xpWaiting.toLocaleString()} tone={xpWaiting ? "gold" : undefined} />
        </dl>
        <LevelPath xpWaiting={xpWaiting} />

        <div className="mt-6 border-t border-line pt-5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold">Business basics</span>
            <span className="tabular-nums text-muted">
              {inPlace.size} of {FOUNDATIONS.length} in place
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-fg/[0.08]">
            <div
              className="h-full rounded-full bg-linear-to-r from-growth/70 to-growth"
              style={{ width: `${Math.round((inPlace.size / FOUNDATIONS.length) * 100)}%` }}
            />
          </div>
          {missing.length ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {missing.map((f) => (
                <li
                  key={f.id}
                  title={planned.has(f.id) ? "A mission covers this" : "Not planned yet"}
                  className={clsx(
                    "rounded-full px-2.5 py-1 text-xs ring-1",
                    planned.has(f.id) ? "bg-star-400/10 text-star-200 ring-star-400/40" : "text-faint ring-line",
                  )}
                >
                  {f.label}
                  {planned.has(f.id) && <span className="ml-1 text-star-300">· planned</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-growth">
              <CheckCircle2 className="size-4" aria-hidden /> Every basic is in place.
            </p>
          )}
          {missing.some((f) => !planned.has(f.id)) && (
            <Link href="/missions" className="tap-target relative mt-4 inline-flex items-center gap-1 text-xs font-semibold text-star-200 hover:underline">
              Plan missions for the gaps <ChevronRight className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

/** How far the open missions get you toward the next level. */
function LevelPath({ xpWaiting }: { xpWaiting: number }) {
  const lvl = useLevel();
  if (!lvl.next) return null;
  const need = lvl.next.xp - lvl.xp;
  const target = (
    <span className="font-semibold text-ink">
      Level {lvl.next.level} · {lvl.next.title}
    </span>
  );

  return (
    <p className="mt-4 flex gap-2.5 rounded-xl bg-fg/[0.03] px-3.5 py-3 text-xs leading-relaxed text-muted ring-1 ring-line">
      <TrendingUp className="mt-0.5 size-4 shrink-0 text-star-300" aria-hidden />
      <span>
        {lvl.blockedByGate || need <= 0 ? (
          <>
            You already have the XP for {target}. It unlocks with <span className="text-star-200">{lvl.nextGate}</span>.
          </>
        ) : xpWaiting >= need ? (
          <>
            Your open missions are worth {xpWaiting.toLocaleString()} XP, more than the {need.toLocaleString()} you need for {target}
            {lvl.nextGate ? (
              <>
                . It also needs <span className="text-star-200">{lvl.nextGate}</span>.
              </>
            ) : (
              "."
            )}
          </>
        ) : (
          <>
            {target} is {need.toLocaleString()} XP away. {xpWaiting ? `Your open missions cover ${xpWaiting.toLocaleString()} of it.` : "Plan some missions to get there."}
          </>
        )}
      </span>
    </p>
  );
}

function FeaturedMission({ mission: m }: { mission: Mission }) {
  const stepsDone = m.steps.filter((s) => s.done).length;
  const ready = m.steps.length > 0 && stepsDone === m.steps.length;
  const nextStep = m.steps.find((s) => !s.done);

  return (
    <div className="relative mt-4 rounded-2xl bg-linear-to-br from-fg/[0.07] to-fg/[0.02] p-5 ring-1 ring-fg/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className={clsx("rounded-full px-2 py-0.5 text-xs font-semibold", CATEGORY_STYLES[m.category])}>{CATEGORY_LABELS[m.category]}</span>
        <span className="text-xs font-semibold text-star-300">+{m.xp} XP</span>
        {ready && (
          <span className="rounded-full bg-growth/15 px-2 py-0.5 text-xs font-semibold text-growth ring-1 ring-growth/40">Ready to report</span>
        )}
      </div>
      <h3 className="mt-2.5 text-xl font-bold leading-tight">{m.title}</h3>
      {m.description && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted" title={m.description}>
          {m.description}
        </p>
      )}

      {m.steps.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted">
            <span>
              {stepsDone} of {m.steps.length} steps
            </span>
            {nextStep && (
              <span className="hidden sm:inline" title={nextStep.text.length > 60 ? nextStep.text : undefined}>
                Next: {nextStep.text.length > 60 ? `${nextStep.text.slice(0, 57)}…` : nextStep.text}
              </span>
            )}
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fg/[0.08]">
            <div
              className="h-full rounded-full bg-linear-to-r from-orbit-400 to-star-400"
              style={{ width: `${Math.max(4, Math.round((stepsDone / m.steps.length) * 100))}%` }}
            />
          </div>
        </div>
      )}

      <ButtonLink href="/missions" size="sm" className="mt-5">
        {ready ? "Report my results" : stepsDone ? "Continue mission" : "Start mission"} <ArrowRight className="size-4" aria-hidden />
      </ButtonLink>
    </div>
  );
}
