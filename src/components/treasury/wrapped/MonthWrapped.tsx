"use client";

import { useState } from "react";
import clsx from "clsx";
import { Download, LoaderCircle, MessagesSquare, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { Wordmark } from "@/components/brand/PolarisMark";
import { Mascot } from "@/components/mascot/Mascot";
import { Columns, CountUp, Delta, Pop, StoryPlayer, type Slide } from "@/components/story/Story";
import { CHART_COLORS } from "@/lib/categories";
import { ACTIVITY_KINDS } from "@/lib/excel";
import { formatMoney } from "@/lib/money";
import { mascotName, usePolaris } from "@/lib/store";
import type { ActivityImpact, MonthlyReport } from "@/lib/types";

const VERDICT = {
  boosted: { label: "Boosted sales", icon: TrendingUp, cls: "bg-growth/20 text-growth" },
  hurt: { label: "Sales dipped", icon: TrendingDown, cls: "bg-alert/20 text-alert" },
  "no clear effect": { label: "No clear effect", icon: null, cls: "bg-fg/15 text-ink" },
  "too early": { label: "Too early to tell", icon: null, cls: "bg-fg/15 text-ink" },
} satisfies Record<ActivityImpact["verdict"], { label: string; icon: typeof TrendingUp | null; cls: string }>;

/** Full-screen, tap-through "Wrapped" story for one month, with PowerPoint download at the end. */
export function MonthWrapped({ report, onClose }: { report: MonthlyReport; onClose: () => void }) {
  const profile = usePolaris((s) => s.profile);
  const openMascot = usePolaris((s) => s.openMascot);
  const [downloading, setDownloading] = useState(false);

  const c = profile.currency;
  const money = (n: number) => formatMoney(n, c, { compact: true });
  const name = mascotName(profile);
  const { stats, previous, history } = report;
  const monthName = new Date(`${report.month}-01T00:00`).toLocaleDateString(undefined, { month: "long" });
  const prevName = previous ? new Date(`${previous.key}-01T00:00`).toLocaleDateString(undefined, { month: "long" }) : undefined;
  const overheadShare = stats.income > 0 ? report.overheads / stats.income : null;
  const topChannel = stats.byChannel.find((ch) => ch.name !== "Not recorded");
  const labels = history.map((h) => h.label);

  const slides = (restart: () => void): Slide[] => [
    {
      id: "intro",
      bg: "from-[#1C3F9A] via-[#0B1B3F] to-[#050B1C]",
      ms: 6000,
      body: (
        <div className="text-center">
          <Pop i={0}>
            <Mascot size={170} greet className="mx-auto" />
          </Pop>
          <Pop i={1}>
            <p className="mt-2 text-lg text-fg/70">{profile.businessName}&apos;s</p>
          </Pop>
          <Pop i={2}>
            <h2 className="font-brand text-starlight text-6xl leading-tight sm:text-7xl">{monthName} Wrapped</h2>
          </Pop>
          <Pop i={3}>
            <p className="mx-auto mt-6 max-w-md text-xl font-semibold leading-snug">{report.headline}</p>
          </Pop>
        </div>
      ),
    },
    {
      id: "sales",
      bg: "from-[#8A5A0B] via-[#3A2A0C] to-[#0B1B3F]",
      ms: 9000,
      body: (
        <div>
          <Pop i={0}>
            <p className="text-lg text-fg/70">In {monthName} you brought in</p>
          </Pop>
          <Pop i={1}>
            <CountUp value={stats.income} format={money} className="block text-6xl font-extrabold tracking-tight sm:text-7xl" />
          </Pop>
          <Pop i={2} className="mt-3">
            <Delta now={stats.income} before={previous?.income} upIsGood vs={prevName} />
          </Pop>
          <Pop i={3} className="mt-8">
            <Columns values={history.map((h) => h.income)} labels={labels} color={CHART_COLORS.income} format={money} />
          </Pop>
          {topChannel && (
            <Pop i={4}>
              <p className="mt-6 text-sm text-fg/70">
                Your biggest platform was <span className="font-semibold text-white">{topChannel.name}</span> ({money(topChannel.amount)})
              </p>
            </Pop>
          )}
          <Pop i={5}>
            <p className="mt-4 text-lg leading-relaxed">{report.stories.sales}</p>
          </Pop>
        </div>
      ),
    },
    {
      id: "costs",
      bg: "from-[#1E4FB8] via-[#0F2A6B] to-[#081433]",
      ms: 9000,
      body: (
        <div>
          <Pop i={0}>
            <p className="text-lg text-fg/70">And you spent</p>
          </Pop>
          <Pop i={1}>
            <CountUp value={stats.expenses} format={money} className="block text-6xl font-extrabold tracking-tight sm:text-7xl" />
          </Pop>
          <Pop i={2} className="mt-3">
            <Delta now={stats.expenses} before={previous?.expenses} upIsGood={false} vs={prevName} />
          </Pop>
          <div className="mt-8 space-y-3">
            {stats.byCategory.slice(0, 4).map((cat, i) => (
              <Pop key={cat.name} i={3 + i}>
                <div className="flex items-center gap-3 text-sm">
                  <span className="w-36 shrink-0 truncate text-fg/80">{cat.name}</span>
                  <span className="h-3 rounded-r-[4px] bg-white" style={{ width: `${(cat.amount / (stats.byCategory[0]?.amount || 1)) * 55}%` }} />
                  <span className="font-semibold tabular-nums">{money(cat.amount)}</span>
                </div>
              </Pop>
            ))}
          </div>
          <Pop i={8}>
            <p className="mt-6 text-lg leading-relaxed">{report.stories.costs}</p>
          </Pop>
        </div>
      ),
    },
    {
      id: "overheads",
      bg: "from-[#4C1D95] via-[#2A1260] to-[#0B1B3F]",
      ms: 8000,
      body: (
        <div>
          <Pop i={0}>
            <p className="text-lg text-fg/70">Your fixed costs took</p>
          </Pop>
          <Pop i={1}>
            <p className="text-7xl font-extrabold tracking-tight">{overheadShare === null ? money(report.overheads) : `${Math.round(overheadShare * 100)}%`}</p>
          </Pop>
          {overheadShare !== null && (
            <Pop i={2}>
              <p className="mt-1 text-fg/70">
                of every sale: {money(report.overheads)} of rent, bills and wages before anything else.
              </p>
              <div className="mt-6 h-4 overflow-hidden rounded-full bg-fg/15" role="img" aria-label={`${Math.round(overheadShare * 100)} percent of sales`}>
                <div className="wrapped-pop h-full rounded-full bg-white" style={{ width: `${Math.min(100, overheadShare * 100)}%`, animationDelay: "700ms" }} />
              </div>
            </Pop>
          )}
          <Pop i={3}>
            <p className="mt-6 text-lg leading-relaxed">{report.stories.overheads}</p>
          </Pop>
        </div>
      ),
    },
    {
      id: "profit",
      bg: stats.net >= 0 ? "from-[#166534] via-[#0D3B22] to-[#062016]" : "from-[#7F1D1D] via-[#3F1010] to-[#140808]",
      ms: 9000,
      body: (
        <div>
          <Pop i={0}>
            <p className="text-lg text-fg/70">{stats.net >= 0 ? "What you kept" : "This month ended at"}</p>
          </Pop>
          <Pop i={1}>
            <CountUp value={stats.net} format={money} className="block text-6xl font-extrabold tracking-tight sm:text-7xl" />
          </Pop>
          {stats.margin !== null && (
            <Pop i={2}>
              <p className="mt-2 text-fg/70">a {Math.round(stats.margin * 100)}% margin on your sales</p>
            </Pop>
          )}
          <Pop i={3} className="mt-8">
            <Columns values={history.map((h) => h.net)} labels={labels} color="#4ADE80" format={money} />
          </Pop>
          <Pop i={4}>
            <p className="mt-6 text-lg leading-relaxed">{report.stories.profit}</p>
          </Pop>
        </div>
      ),
    },
    {
      id: "activities",
      bg: "from-[#0E7490] via-[#0B3F57] to-[#082F49]",
      ms: report.activities.length > 2 ? 12000 : 9000,
      body: (
        <div>
          <Pop i={0}>
            <p className="text-lg text-fg/70">What you did, and what it did for sales</p>
          </Pop>
          {report.activities.length === 0 ? (
            <Pop i={1}>
              <p className="mt-6 text-2xl font-bold leading-snug">No launches, promos or ads logged for {monthName}.</p>
              <p className="mt-3 text-fg/70">Log them in “What happened this month?” and next month&apos;s story will show what actually moves your sales.</p>
            </Pop>
          ) : (
            <ul className="mt-5 space-y-3">
              {report.activities.slice(0, 4).map((a, i) => {
                const v = VERDICT[a.verdict];
                return (
                  <Pop key={a.activityId} i={1 + i}>
                    <li className="rounded-2xl bg-black/25 p-4 ring-1 ring-fg/10">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-fg/60">
                          {new Date(`${a.date}T00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" })} ·{" "}
                          {ACTIVITY_KINDS.find((k) => k.id === a.kind)?.label}
                        </span>
                        <span className={clsx("ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", v.cls)}>
                          {v.icon && <v.icon className="size-3.5" aria-hidden />}
                          {v.label}
                        </span>
                      </div>
                      <p className="mt-1 font-semibold">{a.title}</p>
                      {a.before !== null && a.after !== null && (
                        <p className="mt-1 text-xs tabular-nums text-fg/70">
                          Sales per day: {money(a.before)} before → {money(a.after)} after
                        </p>
                      )}
                      {a.explanation && <p className="mt-1.5 text-sm text-fg/85">{a.explanation}</p>}
                    </li>
                  </Pop>
                );
              })}
            </ul>
          )}
        </div>
      ),
    },
    {
      id: "problems",
      bg: report.problems.length ? "from-[#9A3412] via-[#4A1A0A] to-[#1C0D06]" : "from-[#166534] via-[#0D3B22] to-[#062016]",
      ms: report.problems.length > 2 ? 14000 : 10000,
      body: (
        <div>
          <Pop i={0} className="flex items-center gap-3">
            <Mascot size={64} mood={report.problems.length ? "thinking" : "happy"} />
            <p className="text-lg text-fg/80">{report.problems.length ? "Where it's leaking" : "No leaks spotted"}</p>
          </Pop>
          {report.problems.length === 0 ? (
            <Pop i={1}>
              <p className="mt-6 text-2xl font-bold">Nothing worrying stood out this month. Keep going!</p>
            </Pop>
          ) : (
            <ul className="mt-5 space-y-3">
              {report.problems.map((p, i) => (
                <Pop key={p.title} i={1 + i}>
                  <li className="rounded-2xl bg-black/30 p-4 ring-1 ring-fg/10">
                    <p className="font-bold">{p.title}</p>
                    <p className="mt-1.5 text-sm text-fg/85">
                      <span className="font-semibold text-white">Root cause: </span>
                      {p.rootCause}
                    </p>
                    {p.evidence && <p className="mt-1.5 text-xs text-fg/65">{p.evidence}</p>}
                  </li>
                </Pop>
              ))}
            </ul>
          )}
        </div>
      ),
    },
    {
      id: "outro",
      bg: "from-[#1C3F9A] via-[#0B1B3F] to-[#050B1C]",
      ms: 0,
      body: (
        <div className="text-center">
          <Pop i={0}>
            <Mascot size={150} mood="happy" className="mx-auto" />
          </Pop>
          <Pop i={1}>
            <p className="mx-auto mt-4 max-w-md text-xl font-semibold leading-snug">{report.closing}</p>
          </Pop>
          <Pop i={2} className="mx-auto mt-8 flex max-w-sm flex-col gap-2.5" >
            <button
              type="button"
              data-no-advance
              onClick={async () => {
                setDownloading(true);
                try {
                  const { downloadReportPptx } = await import("./pptx");
                  await downloadReportPptx(report, profile);
                } finally {
                  setDownloading(false);
                }
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-full bg-linear-to-b from-star-300 to-star-500 font-semibold text-on-accent"
            >
              {downloading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
              Download PowerPoint
            </button>
            {report.problems.length > 0 && (
              <button
                type="button"
                data-no-advance
                onClick={() => {
                  onClose();
                  openMascot(
                    `I watched my ${monthName} report. These problems came up: ${report.problems
                      .map((p) => `${p.title} (root cause: ${p.rootCause})`)
                      .join("; ")}. Now I'd like your ideas on how to fix them.`,
                  );
                }}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-fg/10 font-semibold ring-1 ring-fg/20 hover:bg-fg/15"
              >
                <MessagesSquare className="size-4" aria-hidden /> Ask {name} for ideas
              </button>
            )}
            <button
              type="button"
              data-no-advance
              onClick={restart}
              className="flex h-12 items-center justify-center gap-2 rounded-full font-semibold text-fg/80 hover:bg-fg/10"
            >
              <RotateCcw className="size-4" aria-hidden /> Watch again
            </button>
          </Pop>
          <Pop i={3} className="mt-8 flex justify-center opacity-70">
            <Wordmark className="text-3xl" />
          </Pop>
        </div>
      ),
    },
  ];

  return <StoryPlayer label={`${monthName} Wrapped`} slides={slides} onClose={onClose} />;
}
