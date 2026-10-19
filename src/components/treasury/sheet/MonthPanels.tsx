"use client";

import { useState } from "react";
import clsx from "clsx";
import { Landmark, Play } from "lucide-react";
import { Hint } from "@/components/ui/Hint";
import { Ticker } from "@/components/ui/motion";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { monthSeries, runwayMonths } from "@/lib/finance";
import { fieldClass, parseAmount } from "@/lib/inputs";
import { formatMoney } from "@/lib/money";
import { usePolaris } from "@/lib/store";
import type { MonthlyReport } from "@/lib/types";

/** Cash in the bank today, and how long it lasts at the recent loss rate. */
export function CashCard() {
  const currency = usePolaris((s) => s.profile.currency);
  const entries = usePolaris((s) => s.entries);
  const cash = usePolaris((s) => s.cashOnHand);
  const setCash = usePolaris((s) => s.setCashOnHand);
  const [draft, setDraft] = useState(cash === null ? "" : String(cash));
  const runway = cash === null ? null : runwayMonths(cash, entries);
  const hasActivity = monthSeries(entries, new Date(), 3).some((m) => m.income || m.expenses);

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <Landmark className="size-4 text-star-300" aria-hidden /> Cash and runway
      </h2>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Cash in the business account today</span>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">{currency}</span>
          <input
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              const v = parseAmount(draft);
              setCash(Number.isFinite(v) ? v : null);
            }}
            placeholder="0.00"
            className={clsx(fieldClass, "pl-14")}
          />
        </div>
      </label>
      <p className="mt-4 flex items-center gap-1.5 text-sm leading-relaxed text-muted">
        {cash === null ? (
          "Add your cash balance to see how long it would last."
        ) : !hasActivity ? (
          "Log a few months of sales and costs to work out your runway."
        ) : runway === null ? (
          <>
            <span className="font-semibold text-growth">Not running down</span>
            <Hint label="About your runway">
              You&apos;ve made money on average over the last 3 months, so your cash isn&apos;t running down. Keep it that way.
            </Hint>
          </>
        ) : (
          <>
            <span>
              Lasts about{" "}
              <span className={clsx("font-semibold", runway < 3 ? "text-alert" : "text-ink")}>
                <Ticker value={`${runway.toFixed(1)} months`} num={runway} />
              </span>
            </span>
            <Hint label="About your runway">At your recent loss rate, {formatMoney(cash, currency)} lasts about {runway.toFixed(1)} months.</Hint>
          </>
        )}
      </p>
    </section>
  );
}

/** Every month that's been wrapped, to watch again. */
export function WrappedStories({ onWatch }: { onWatch: (report: MonthlyReport) => void }) {
  const currency = usePolaris((s) => s.profile.currency);
  const reports = usePolaris((s) => s.monthReports);
  const stories = Object.values(reports).sort((a, b) => b.month.localeCompare(a.month));

  return (
    <section className="panel p-5 sm:p-6">
      <SectionTitle title="Your Wrapped stories" hint="Every month you've wrapped, to watch again anytime." />
      {stories.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-fg/10 p-6 text-center text-sm text-muted">
          No stories yet. Use &ldquo;Make my Wrapped&rdquo; at the top once a month is filled in.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {stories.map((r) => (
            <li key={r.month}>
              <button
                type="button"
                onClick={() => onWatch(r)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-fg/[0.06]"
              >
                <Play className="size-3.5 shrink-0 text-star-300" aria-hidden />
                <span className="flex-1">{r.stats.label}</span>
                <span className="text-xs tabular-nums text-muted">{formatMoney(r.stats.net, currency, { compact: true })} net</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
