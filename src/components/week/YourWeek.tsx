"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ArrowRight, CalendarDays, CheckCircle2, Compass, MessagesSquare, Play, RotateCcw, TriangleAlert, type LucideIcon } from "lucide-react";
import { Wordmark } from "@/components/brand/PolarisMark";
import { Mascot } from "@/components/mascot/Mascot";
import { Columns, CountUp, Delta, Pop, StoryPlayer, type Slide } from "@/components/story/Story";
import { CHART_COLORS } from "@/lib/categories";
import { formatMoney } from "@/lib/money";
import { mascotName, usePolaris } from "@/lib/store";
import { yourWeek, type WeekFollowUp, type WeekTone, type YourWeek } from "@/lib/week";

const TONE: Record<WeekTone, { icon: LucideIcon; bg: string; ring: string; text: string }> = {
  alert: { icon: TriangleAlert, bg: "from-[#7F1D1D] via-[#3F1010] to-[#140808]", ring: "bg-alert/20 text-alert", text: "text-alert" },
  caution: { icon: TriangleAlert, bg: "from-[#8A5A0B] via-[#3A2A0C] to-[#0B1B3F]", ring: "bg-caution/20 text-caution", text: "text-caution" },
  good: { icon: CheckCircle2, bg: "from-[#166534] via-[#0D3B22] to-[#062016]", ring: "bg-growth/20 text-growth", text: "text-growth" },
  info: { icon: Compass, bg: "from-[#4C1D95] via-[#2A1260] to-[#0B1B3F]", ring: "bg-fg/15 text-star-200", text: "text-star-300" },
};

/** Your Week from the shop's own records. Call only after hydration: it reads today's date. */
export function useYourWeek() {
  const entries = usePolaris((s) => s.entries);
  const missions = usePolaris((s) => s.missions);
  const products = usePolaris((s) => s.products);
  const channels = usePolaris((s) => s.channels);
  const stockMoves = usePolaris((s) => s.stockMoves);
  const cashOnHand = usePolaris((s) => s.cashOnHand);
  const profile = usePolaris((s) => s.profile);
  return yourWeek({ entries, missions, products, channels, stockMoves, cashOnHand, profile });
}

const VERDICT: Record<WeekFollowUp["verdict"], { label: string; cls: string }> = {
  solved: { label: "Sorted", cls: "bg-growth/20 text-growth" },
  better: { label: "Better", cls: "bg-growth/20 text-growth" },
  same: { label: "Still there", cls: "bg-fg/15 text-white" },
  worse: { label: "Worse", cls: "bg-alert/20 text-alert" },
};

/**
 * The week as a tap-through story: the last 7 days in numbers, how last week's problems look now,
 * the best seller, then this week's problems, one slide each. Each says why it matters and gives
 * a few options; the owner decides what to do.
 */
export function YourWeekStory({ week, onClose }: { week: YourWeek; onClose: () => void }) {
  const router = useRouter();
  const profile = usePolaris((s) => s.profile);
  const openMascot = usePolaris((s) => s.openMascot);
  const name = mascotName(profile);
  const money = (n: number) => formatMoney(n, profile.currency, { compact: true });
  const logged = week.income > 0 || week.expenses > 0;
  const problems = week.priorities.filter((p) => p.problem);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const slides = (restart: () => void): Slide[] => [
    {
      id: "intro",
      bg: "from-[#0E7490] via-[#0B3F57] to-[#082F49]",
      ms: 6000,
      body: (
        <div className="text-center">
          <Pop i={0}>
            <Mascot size={160} greet className="mx-auto" />
          </Pop>
          <Pop i={1}>
            <p className="mt-2 text-lg text-fg/70">{profile.businessName}&apos;s</p>
          </Pop>
          <Pop i={2}>
            <h2 className="font-brand text-starlight text-6xl leading-tight sm:text-7xl">Your Week</h2>
          </Pop>
          <Pop i={3}>
            <p className="mt-1 text-fg/70">{week.label}</p>
          </Pop>
          <Pop i={4}>
            <p className="mx-auto mt-6 max-w-md text-xl font-semibold leading-snug">{week.headline}</p>
          </Pop>
        </div>
      ),
    },
    {
      id: "money",
      bg: "from-[#8A5A0B] via-[#3A2A0C] to-[#0B1B3F]",
      ms: logged ? 9000 : 6000,
      body: logged ? (
        <div>
          <Pop i={0}>
            <p className="text-lg text-fg/70">In the last 7 days you brought in</p>
          </Pop>
          <Pop i={1}>
            <CountUp value={week.income} format={money} className="block text-6xl font-extrabold tracking-tight sm:text-7xl" />
          </Pop>
          <Pop i={2} className="mt-3">
            <Delta now={week.income} before={week.prev?.income} upIsGood vs="the week before" />
          </Pop>
          <Pop i={3} className="mt-8">
            <Columns values={week.weeks.map((w) => w.income)} labels={week.weeks.map((w) => w.label)} color={CHART_COLORS.income} format={money} />
            <p className="mt-2 text-center text-xs text-fg/60">Money in, week by week</p>
          </Pop>
          <Pop i={4}>
            <p className="mt-6 text-lg leading-relaxed">
              You spent {money(week.expenses)}, so you {week.net >= 0 ? "kept" : "were down"}{" "}
              <span className={clsx("font-bold", week.net >= 0 ? "text-growth" : "text-alert")}>{money(Math.abs(week.net))}</span>.
              {week.topChannel && (
                <>
                  {" "}
                  Most of it came through <span className="font-semibold text-white">{week.topChannel.name}</span>.
                </>
              )}
            </p>
          </Pop>
        </div>
      ) : (
        <div>
          <Pop i={0}>
            <p className="text-lg text-fg/70">The last 7 days</p>
          </Pop>
          <Pop i={1}>
            <p className="mt-3 text-4xl font-extrabold leading-tight">No sales or costs logged yet.</p>
          </Pop>
          <Pop i={2}>
            <p className="mt-4 text-lg text-fg/80">Log them in Treasury and next week&apos;s story will show how the week went.</p>
          </Pop>
        </div>
      ),
    },
    ...(week.lastWeek.length
      ? [
          {
            id: "last-week",
            bg: "from-[#1E3A5F] via-[#10233F] to-[#081433]",
            ms: 9000,
            body: (
              <div>
                <Pop i={0}>
                  <p className="text-lg text-fg/70">A week ago, the biggest problems were</p>
                </Pop>
                <ul className="mt-5 space-y-3">
                  {week.lastWeek.map((f, i) => (
                    <Pop key={f.id} i={1 + i}>
                      <li className="rounded-2xl bg-black/25 p-4 ring-1 ring-fg/10">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold">{f.then}</p>
                          <span className={clsx("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold", VERDICT[f.verdict].cls)}>{VERDICT[f.verdict].label}</span>
                        </div>
                        <p className="mt-1 text-sm text-fg/80">Now: {f.now}</p>
                      </li>
                    </Pop>
                  ))}
                </ul>
              </div>
            ),
          } satisfies Slide,
        ]
      : []),
    ...(week.bestSeller
      ? [
          {
            id: "best",
            bg: "from-[#1E4FB8] via-[#0F2A6B] to-[#081433]",
            ms: 7000,
            body: (
              <div>
                <Pop i={0}>
                  <p className="text-lg text-fg/70">Your best seller this week</p>
                </Pop>
                <Pop i={1}>
                  <p className="mt-2 text-5xl font-extrabold leading-tight tracking-tight">{week.bestSeller.name}</p>
                </Pop>
                <Pop i={2}>
                  <p className="mt-4 text-xl">
                    {week.bestSeller.sold} sold, making <CountUp value={week.bestSeller.profit} format={money} className="font-bold text-growth" /> profit
                  </p>
                </Pop>
                <Pop i={3}>
                  <p className="mt-3 text-fg/70">That&apos;s {money(week.bestSeller.each)} on each one, after its cost and platform fees.</p>
                </Pop>
              </div>
            ),
          } satisfies Slide,
        ]
      : []),
    ...(week.priorities.length
      ? week.priorities.map((p, i): Slide => {
          const tone = TONE[p.tone];
          return {
            id: p.id,
            bg: tone.bg,
            ms: 9000,
            body: (
              <div>
                <Pop i={0}>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-fg/70">
                    This week · {i + 1} of {week.priorities.length}
                  </p>
                </Pop>
                <Pop i={1}>
                  <span className={clsx("mt-5 grid size-14 place-items-center rounded-2xl", tone.ring)}>
                    <tone.icon className="size-7" aria-hidden />
                  </span>
                </Pop>
                <Pop i={2}>
                  <h3 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight">{p.title}</h3>
                </Pop>
                <Pop i={3}>
                  <p className="mt-4 text-xl leading-relaxed text-fg/90">{p.why}</p>
                </Pop>
                {p.options.length > 0 && (
                  <Pop i={4}>
                    <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-fg/60">Some options</p>
                    <ul className="mt-2 space-y-1.5">
                      {p.options.map((o) => (
                        <li key={o} className="flex gap-2.5 text-lg text-fg/90">
                          <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-white/70" aria-hidden />
                          {o}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-sm text-fg/60">Which, if any, is your call.</p>
                  </Pop>
                )}
                <Pop i={5}>
                  <button
                    type="button"
                    data-no-advance
                    onClick={() => go(p.href)}
                    className="mt-7 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-[#0B1B3F] hover:bg-white/90"
                  >
                    Look into it <ArrowRight className="size-4" aria-hidden />
                  </button>
                </Pop>
              </div>
            ),
          };
        })
      : [
          {
            id: "clear",
            bg: TONE.good.bg,
            ms: 7000,
            body: (
              <div>
                <Pop i={0} className="flex items-center gap-3">
                  <Mascot size={64} mood="happy" />
                  <p className="text-lg text-fg/80">This week</p>
                </Pop>
                <Pop i={1}>
                  <p className="mt-6 text-4xl font-extrabold leading-tight">No problems stand out.</p>
                </Pop>
                <Pop i={2}>
                  <p className="mt-4 text-lg text-fg/80">Keep logging sales and stock, and Polaris will point out anything worth a look.</p>
                </Pop>
              </div>
            ),
          } satisfies Slide,
        ]),
    ...(week.coming.length
      ? [
          {
            id: "coming",
            bg: "from-[#0E7490] via-[#0B3F57] to-[#082F49]",
            ms: 8000,
            body: (
              <div>
                <Pop i={0} className="flex items-center gap-3">
                  <CalendarDays className="size-7 text-star-300" aria-hidden />
                  <p className="text-lg text-fg/80">Coming up in the next two weeks</p>
                </Pop>
                <ul className="mt-6 space-y-3">
                  {week.coming.slice(0, 4).map((e, i) => (
                    <Pop key={`${e.date}-${e.name}`} i={1 + i}>
                      <li className="flex items-center justify-between gap-4 rounded-2xl bg-black/25 p-4 ring-1 ring-fg/10">
                        <span className="min-w-0">
                          <span className="block font-semibold">{e.name}</span>
                          <span className="text-sm text-fg/70">
                            {new Date(`${e.date}T00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                            {e.approx ? " (approx.)" : ""}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-full bg-fg/15 px-3 py-1 text-sm font-semibold tabular-nums">
                          {e.daysAway === 0 ? "Today" : e.daysAway === 1 ? "Tomorrow" : `In ${e.daysAway} days`}
                        </span>
                      </li>
                    </Pop>
                  ))}
                </ul>
              </div>
            ),
          } satisfies Slide,
        ]
      : []),
    {
      id: "outro",
      bg: "from-[#0E7490] via-[#0B3F57] to-[#082F49]",
      ms: 0,
      body: (
        <div className="text-center">
          <Pop i={0}>
            <Mascot size={140} mood="happy" className="mx-auto" />
          </Pop>
          <Pop i={1}>
            <p className="mx-auto mt-4 max-w-md text-2xl font-bold leading-snug">That&apos;s your week.</p>
            <p className="mx-auto mt-2 max-w-sm text-fg/70">
              {problems.length ? "Which of these matters most to you right now?" : "It updates as you log sales, stock and missions, so check back any day."}
            </p>
          </Pop>
          <Pop i={2} className="mx-auto mt-6 flex max-w-sm flex-col gap-2.5">
            {problems.map((p) => (
              <button
                key={p.id}
                type="button"
                data-no-advance
                onClick={() => go(p.href)}
                className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3 text-left font-semibold ring-1 ring-fg/20 hover:bg-white/15"
              >
                {p.title} <ArrowRight className="size-4 shrink-0" aria-hidden />
              </button>
            ))}
            <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1">
              <button
                type="button"
                data-no-advance
                onClick={() => {
                  onClose();
                  openMascot(
                    `I watched my week. ${week.headline} The problems it showed: ${problems.map((p) => `${p.title} (${p.why})`).join("; ") || "none"}. Can you help me think through them?`,
                  );
                }}
                className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-fg/80 hover:bg-fg/10"
              >
                <MessagesSquare className="size-4" aria-hidden /> Talk it through with {name}
              </button>
              <button
                type="button"
                data-no-advance
                onClick={restart}
                className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-fg/80 hover:bg-fg/10"
              >
                <RotateCcw className="size-4" aria-hidden /> Watch again
              </button>
            </div>
          </Pop>
          <Pop i={3} className="mt-8 flex justify-center opacity-70">
            <Wordmark className="text-3xl" />
          </Pop>
        </div>
      ),
    },
  ];

  return <StoryPlayer label="Your Week" slides={slides} onClose={onClose} />;
}

/** Your Week on the home page: the headline, what needs doing, and the story to play. */
export function YourWeekCard() {
  const week = useYourWeek();
  const [playing, setPlaying] = useState(false);
  const sorted = week.lastWeek.length ? week.lastWeek.filter((f) => f.verdict === "solved" || f.verdict === "better").length : null;

  return (
    <section aria-labelledby="week-title" className="panel relative overflow-hidden p-5 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[#0E7490]/25 blur-3xl" />
      {/* The button only moves beside the cards from xl: at lg the sidebar leaves too little room. */}
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:gap-8">
        <div className="min-w-0 flex-1">
          <p className="eyebrow text-star-400">Your Week · {week.label}</p>
          <h2 id="week-title" className="mt-1.5 text-lg font-semibold leading-snug sm:text-xl">
            {week.headline}
          </h2>
          {sorted !== null && (
            <p className="mt-1 text-sm text-muted">
              A week ago: {sorted} of {week.lastWeek.length} {week.lastWeek.length === 1 ? "problem" : "problems"} sorted or better since.
            </p>
          )}
          {/* On a phone the button sits under the headline, where it's on screen. */}
          <PlayButton onClick={() => setPlaying(true)} className="mt-4 inline-flex xl:hidden" />
          {week.priorities.length > 0 && (
            <ol className="mt-4 grid gap-2.5 md:grid-cols-3">
              {week.priorities.map((p, i) => {
                const tone = TONE[p.tone];
                return (
                  <li key={p.id} className="min-w-0">
                    <Link href={p.href} className="group flex h-full gap-3 rounded-xl bg-fg/[0.04] p-3 ring-1 ring-line transition-colors hover:bg-fg/[0.07]">
                      <span className={clsx("grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold", tone.ring)}>{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-snug">{p.title}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{p.why}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <PlayButton onClick={() => setPlaying(true)} className="hidden xl:inline-flex" />
      </div>
      {playing && <YourWeekStory week={week} onClose={() => setPlaying(false)} />}
    </section>
  );
}

/** The display class comes from the caller: a base `inline-flex` here would beat a caller's `hidden`. */
function PlayButton({ onClick, className }: { onClick: () => void; className: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "shrink-0 items-center justify-center gap-2 rounded-full bg-star-400 px-5 py-3 text-sm font-semibold text-on-accent shadow-[0_8px_24px_-8px_var(--accent-glow)] transition-[transform,filter] duration-150 ease-out hover:brightness-105 active:scale-[0.97]",
        className,
      )}
    >
      <Play className="size-4" aria-hidden /> Play your week
    </button>
  );
}

/**
 * Your Week in the interactive world: a sticky note on the computer screen. Tap it to play the
 * story. On a phone it's a card in the stack instead.
 */
export function WeekNote({ className, card = false }: { className?: string; card?: boolean }) {
  const week = useYourWeek();
  const [playing, setPlaying] = useState(false);
  const count = week.priorities.filter((p) => p.problem).length;
  const status = count ? `${count} problem${count === 1 ? "" : "s"} to look at` : "Nothing stands out";

  return (
    <>
      {card ? (
        <button type="button" onClick={() => setPlaying(true)} className="world-object flex w-full items-center gap-4 rounded-2xl bg-surface-900/80 p-3 text-left ring-1 ring-line">
          <span className="grid size-14 shrink-0 rotate-[-4deg] place-items-center rounded-sm bg-[#fde68a] text-[#7c4a03] shadow-[0_6px_10px_-6px_rgb(0_0_0/0.6)]">
            <CalendarDays className="size-6" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-bold">Your Week</span>
            <span className="text-sm text-muted">
              {week.label} · {status.toLowerCase()}
            </span>
          </span>
          <Play className="ml-auto size-5 shrink-0 text-star-300" aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Your Week, ${week.label}: ${status}. Play the story`}
          className={clsx(
            "world-object h-[104px] w-[112px] rotate-[5deg] rounded-[2px] bg-[#fde68a] p-2.5 text-left text-[#3f2a06] shadow-[0_14px_18px_-10px_rgb(0_0_0/0.65)]",
            className,
          )}
        >
          {/* the sticky strip along the top */}
          <span className="absolute inset-x-0 top-0 h-3 bg-[#fcd34d]" aria-hidden />
          <span className="relative mt-1.5 block text-[13px] font-extrabold leading-tight">Your Week</span>
          <span className="relative mt-0.5 block text-[11px] font-semibold leading-tight text-[#7c4a03]">{week.label}</span>
          <span className="relative mt-1.5 block text-[11px] font-bold leading-tight">{status}</span>
          <span className="relative mt-1 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wide text-[#b45309]">
            <Play className="size-3" aria-hidden /> Play
          </span>
        </button>
      )}
      {playing && <YourWeekStory week={week} onClose={() => setPlaying(false)} />}
    </>
  );
}
