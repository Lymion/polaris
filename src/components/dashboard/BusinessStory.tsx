"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Bookmark, CalendarHeart, History, Package, Palette, Play, Trophy, Wallet, type LucideIcon } from "lucide-react";
import { StatusPill } from "@/components/stock/StatusPill";
import { daysText } from "@/lib/inventory";
import { Mascot } from "@/components/mascot/Mascot";
import { MonthWrapped } from "@/components/treasury/wrapped/MonthWrapped";
import { ButtonLink } from "@/components/ui/Button";
import { ACTIVITY_KINDS } from "@/lib/excel";
import { expensesByCategory, monthSeries, runwayMonths, totalOverheads } from "@/lib/finance";
import { formatMoney, monthKey } from "@/lib/money";
import { mascotName, usePolaris } from "@/lib/store";
import type { StudioTool } from "@/lib/studio";
import type { MonthlyReport, TreasuryEntry } from "@/lib/types";
import { useStock } from "@/lib/useStock";
import { CardTitle, Stat } from "./parts";

const STUDIO_KINDS: Record<StudioTool, string> = { brand: "Brand kit", campaign: "Campaign", video: "Video idea", calendar: "Week plan" };

type StoryInput = Pick<ReturnType<typeof usePolaris.getState>, "entries" | "activities"> & { currency: string };

/** Where most of the month's sales came from, by platform. */
function topChannel(entries: TreasuryEntry[], key: string) {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.type === "income" && e.channel && e.date.startsWith(key)) totals.set(e.channel, (totals.get(e.channel) ?? 0) + e.amount);
  }
  const [best] = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  return best ? { name: best[0], amount: best[1] } : null;
}

/** The month in a few plain sentences, from what's logged. Describes; doesn't advise. */
export function storyOf(s: StoryInput) {
  const c = s.currency;
  const fmt = (n: number) => formatMoney(n, c, { compact: true });
  const now = new Date();
  const monthName = now.toLocaleDateString(undefined, { month: "long" });
  const [prev, cur] = monthSeries(s.entries, now, 2);
  const lines: string[] = [];

  if (!cur.income && !cur.expenses) {
    lines.push(`Nothing is logged for ${monthName} yet, so I can't tell how the month is going. Add your sales and costs in Treasury and I'll keep this story up to date.`);
  } else {
    lines.push(
      `${monthName} so far: ${fmt(cur.income)} came in and ${fmt(cur.expenses)} went out, so you're ${cur.net >= 0 ? `${fmt(cur.net)} up` : `${fmt(-cur.net)} down`}.`,
    );
    if (prev.income || prev.expenses) lines.push(`Last month ended ${prev.net >= 0 ? `${fmt(prev.net)} up` : `${fmt(-prev.net)} down`}.`);
    const top = expensesByCategory(s.entries, cur.key)[0];
    if (top && cur.expenses) {
      lines.push(`Your biggest cost is ${top.category.toLowerCase()} at ${fmt(top.amount)}, ${Math.round((top.amount / cur.expenses) * 100)}% of your spending.`);
    }
    const channel = topChannel(s.entries, cur.key);
    if (channel) lines.push(`Most sales came through ${channel.name} (${fmt(channel.amount)}).`);
  }

  const acts = s.activities.filter((a) => a.date.startsWith(cur.key));
  if (acts.length) {
    lines.push(
      `To grow sales you logged ${acts.length === 1 ? "one thing" : `${acts.length} things`}: ${acts
        .slice(0, 3)
        .map((a) => a.title)
        .join(", ")}${acts.length > 3 ? " and more" : ""}.`,
    );
  }
  return lines.join(" ");
}

/** "Your business right now": Lumi's story of the month, then money, recent activity and studio. */
export function BusinessStory() {
  // Only the slices the story reads, so a streaming chat reply doesn't re-render the page.
  const entries = usePolaris((s) => s.entries);
  const activities = usePolaris((s) => s.activities);
  const currency = usePolaris((s) => s.profile.currency);
  const name = usePolaris((s) => mascotName(s.profile));
  const reports = usePolaris((s) => s.monthReports);
  const [watching, setWatching] = useState<MonthlyReport | null>(null);
  const thisMonth = monthKey(new Date());
  // The newest Wrapped story, preferring this month's.
  const latest = reports[thisMonth] ?? Object.values(reports).sort((a, b) => b.month.localeCompare(a.month))[0];

  return (
    <section aria-labelledby="story-title" className="space-y-6">
      <h2 id="story-title" className="eyebrow text-star-400">
        Your business right now
      </h2>

      <div className="panel flex items-start gap-4 p-5 sm:gap-5 sm:p-6">
        <Mascot size={52} className="shrink-0 sm:size-[72px]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-star-200">{name}&apos;s take on the month</p>
          <p className="mt-1.5 text-[15px] leading-relaxed">{storyOf({ entries, activities, currency })}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {latest && (
              <button
                type="button"
                onClick={() => setWatching(latest)}
                className="inline-flex items-center gap-2 rounded-full bg-star-400 px-4 py-2 text-sm font-semibold text-on-accent hover:brightness-105"
              >
                <Play className="size-4" aria-hidden /> Watch {latest.stats.label} Wrapped
              </button>
            )}
            <ButtonLink href="/treasury" variant="secondary" size="sm" className="h-9">
              Open Treasury <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 [&>*]:min-w-0">
        <MoneyCard />
        <StockCard />
        <RecentActivity />
        <StudioCard />
      </div>

      {watching && <MonthWrapped report={watching} onClose={() => setWatching(null)} />}
    </section>
  );
}

function MoneyCard() {
  const entries = usePolaris((s) => s.entries);
  const overheads = usePolaris((s) => s.overheads);
  const cash = usePolaris((s) => s.cashOnHand);
  const currency = usePolaris((s) => s.profile.currency);
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  const [prev, cur] = monthSeries(entries, new Date(), 2);
  const runway = cash === null ? null : runwayMonths(cash, entries);
  const fixed = totalOverheads(overheads);

  return (
    <section className="panel p-5 sm:p-6">
      <CardTitle icon={Wallet} title="Money this month" href="/treasury" />
      <dl className="mt-4">
        <Stat
          label="Net so far"
          value={fmt(cur.net)}
          tone={cur.net < 0 ? "bad" : cur.net > 0 ? "good" : undefined}
          note={prev.income || prev.expenses ? `Last month ended ${fmt(prev.net)}` : undefined}
        />
      </dl>
      <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        <Fact label="Money in" value={fmt(cur.income)} tone={cur.income ? "good" : undefined} />
        <Fact label="Money out" value={fmt(cur.expenses)} tone={cur.expenses ? "bad" : undefined} />
        <Fact label="Fixed costs" value={fixed ? `${fmt(fixed)} a month` : "Not added yet"} />
        <Fact
          label="Cash runway"
          value={cash === null ? "Add your cash balance" : runway === null ? "Not running down" : `About ${runway.toFixed(1)} months`}
          tone={runway !== null && runway < 3 ? "bad" : undefined}
        />
      </ul>
    </section>
  );
}

/** What's on the shelf: money tied up in stock, and anything that needs reordering or is sitting still. */
function StockCard() {
  const products = usePolaris((s) => s.products);
  const currency = usePolaris((s) => s.profile.currency);
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });
  const sum = useStock().summary;
  const attention = [...sum.out, ...sum.low.sort((a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9)), ...sum.slow].slice(0, 4);

  return (
    <section className="panel p-5 sm:p-6">
      <CardTitle icon={Package} title="Stock" href="/stock" />
      {sum.tracked === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {products.length
            ? "Count what's on your shelf in Stock, and Polaris warns you before anything runs out and shows what each product earns."
            : "Add the products you sell in Treasury, then track their stock so you never run out or overbuy."}
        </p>
      ) : (
        <>
          <dl className="mt-4">
            <Stat
              label="Money in stock"
              value={fmt(sum.value)}
              note={sum.shelfProfit > 0 ? `About ${fmt(sum.shelfProfit)} profit once it sells` : `${sum.tracked} ${sum.tracked === 1 ? "product" : "products"} tracked`}
            />
          </dl>
          <ul className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
            {attention.length ? (
              attention.map((l) => (
                <li key={l.product.id} className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{l.product.name}</span>
                    <span className="block text-xs text-faint">
                      {l.status === "out"
                        ? l.perDay > 0 && l.margin.profit > 0
                          ? `None left: about ${fmt(l.perDay * 7 * l.margin.profit)} profit missed a week`
                          : "None left"
                        : l.status === "slow"
                          ? `${l.onHand} in stock, ${l.sold30} sold in 30 days: ${fmt(l.value)} tied up`
                          : `${l.onHand} left, lasts ${daysText(l.daysLeft)}`}
                    </span>
                  </span>
                  <StatusPill status={l.status} />
                </li>
              ))
            ) : (
              <li className="text-muted">Everything is stocked and selling.</li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={clsx("tabular-nums", tone ? "font-semibold" : "font-medium", tone === "good" && "text-growth", tone === "bad" && "text-alert")}>
        {value}
      </span>
    </li>
  );
}

export interface FeedItem {
  at: number;
  icon: LucideIcon;
  text: string;
  detail: string;
}

export function when(at: number) {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(new Date()) - day(new Date(at))) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** The latest things that happened: promos and launches, finished missions, saved ideas, Wrapped stories. */
export function useActivityFeed(limit: number) {
  const activities = usePolaris((s) => s.activities);
  const missions = usePolaris((s) => s.missions);
  const studioItems = usePolaris((s) => s.studioItems);
  const reports = usePolaris((s) => s.monthReports);
  const stockMoves = usePolaris((s) => s.stockMoves);
  const products = usePolaris((s) => s.products);
  const productName = new Map(products.map((p) => [p.id, p.name]));

  return [
    ...stockMoves
      .filter((m) => m.kind === "restock" && productName.has(m.productId))
      .slice(0, 20)
      .map((m) => ({ at: new Date(`${m.date}T12:00`).getTime(), icon: Package, text: `Restocked ${productName.get(m.productId)} × ${m.qty}`, detail: "Stock" })),
    ...activities.map((a) => ({
      at: new Date(`${a.date}T12:00`).getTime(),
      icon: CalendarHeart,
      text: a.title,
      detail: ACTIVITY_KINDS.find((k) => k.id === a.kind)?.label ?? "Activity",
    })),
    ...missions
      .filter((m) => m.status === "done" && m.completedAt)
      .map((m) => ({ at: new Date(m.completedAt!).getTime(), icon: Trophy, text: m.title, detail: `Mission done · +${m.xp} XP` })),
    ...studioItems.map((i) => ({ at: new Date(i.createdAt).getTime(), icon: Bookmark, text: i.title, detail: `Saved ${STUDIO_KINDS[i.output.tool].toLowerCase()}` })),
    ...Object.values(reports).map((r) => ({ at: new Date(r.createdAt).getTime(), icon: Play, text: `${r.stats.label} Wrapped`, detail: "Month story made" })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, limit) satisfies FeedItem[];
}

function RecentActivity() {
  const feed = useActivityFeed(5);

  return (
    <section className="panel p-5 sm:p-6">
      <CardTitle icon={History} title="Recent activity" href="/treasury" />
      {feed.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Your activity shows up here as you finish missions, log promos and launches, and save ideas.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {feed.map((f, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-fg/[0.06] text-star-300" aria-hidden>
                <f.icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{f.text}</span>
                <span className="block text-xs text-faint">
                  {f.detail} · {when(f.at)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StudioCard() {
  const items = usePolaris((s) => s.studioItems);
  const businessName = usePolaris((s) => s.profile.businessName);
  const counts = (Object.keys(STUDIO_KINDS) as StudioTool[]).map((k) => ({ k, n: items.filter((i) => i.output.tool === k).length })).filter((c) => c.n);
  const latest = items[0];

  return (
    <section className="panel relative overflow-hidden p-5 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-10 size-64 rounded-full bg-fuchsia-500/15 blur-3xl" />
      <CardTitle icon={Palette} title="Creative Studio" href="/studio" />
      {items.length === 0 ? (
        <p className="relative mt-4 text-sm leading-relaxed text-muted">
          Nothing saved yet. Brand pieces, campaign plans, video storyboards and a week of posts for {businessName}, made in seconds.
        </p>
      ) : (
        <>
          <p className="relative mt-4 text-sm text-muted">
            <span className="text-2xl font-bold text-ink">{items.length}</span> {items.length === 1 ? "idea" : "ideas"} saved
          </p>
          <ul className="relative mt-2 flex flex-wrap gap-1.5">
            {counts.map(({ k, n }) => (
              <li key={k} className="rounded-full bg-fg/[0.05] px-2.5 py-1 text-xs text-muted ring-1 ring-line">
                {n} {STUDIO_KINDS[k].toLowerCase()}
                {n === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
          <p className="relative mt-4 truncate text-sm">
            <span className="text-faint">Latest: </span>
            <span className="font-medium">{latest.title}</span>
          </p>
        </>
      )}
      <div className="relative mt-5 flex flex-wrap gap-2">
        <ButtonLink href="/studio" variant="secondary" size="sm">
          {items.length ? "Open the studio" : "Spark an idea"} <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
        {items.length > 0 && (
          <Link href="/studio#library" className="inline-flex h-8 items-center px-2 text-sm font-medium text-muted hover:text-ink">
            Idea library
          </Link>
        )}
      </div>
    </section>
  );
}
