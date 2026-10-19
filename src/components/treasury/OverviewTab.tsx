"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Hint } from "@/components/ui/Hint";
import { Ticker } from "@/components/ui/motion";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { expensesByCategory, monthSeries, totalOverheads } from "@/lib/finance";
import { formatMoney, monthKey } from "@/lib/money";
import { usePolaris } from "@/lib/store";
import { BarList, CashflowChart } from "./CashflowChart";
import { BiggestFixedCosts } from "./Overheads";
import { ActivitiesLog } from "./sheet/ActivitiesLog";

/**
 * The month at a glance: headline numbers, the 6-month trend beside Lumi's helpers, where the
 * money went and what was done that month. `nav` is the shared month picker; `helper` is Lumi's
 * money helper panel.
 */
export function OverviewTab({ selected, nav, helper, onLog }: { selected: Date; nav: ReactNode; helper: ReactNode; onLog: () => void }) {
  const entries = usePolaris((s) => s.entries);
  const overheads = usePolaris((s) => s.overheads);
  const currency = usePolaris((s) => s.profile.currency);

  const series = monthSeries(entries, selected, 6);
  const current = series[series.length - 1];
  const previous = series[series.length - 2];
  const margin = current.income > 0 ? current.net / current.income : null;
  const prevMargin = previous.income > 0 ? previous.net / previous.income : null;
  const monthName = selected.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const key = monthKey(selected);
  const spending = expensesByCategory(entries, key);

  return (
    <div className="space-y-6">
      {/* One filter row scopes everything below it. */}
      {nav}

      {/* Five across only from xl: at lg the sidebar leaves the money figures too little room. */}
      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <StatTile label="Money in" value={formatMoney(current.income, currency, { compact: true })} num={current.income} delta={pctChange(current.income, previous.income)} upIsGood prev={previous.label} />
        <StatTile label="Money out" value={formatMoney(current.expenses, currency, { compact: true })} num={current.expenses} delta={pctChange(current.expenses, previous.expenses)} upIsGood={false} prev={previous.label} />
        {/* Net can cross zero, where a percentage change is meaningless, so show the money change. */}
        <StatTile
          label="Net"
          value={formatMoney(current.net, currency, { compact: true })}
          num={current.net}
          tone={current.net < 0 ? "bad" : undefined}
          delta={
            previous.income || previous.expenses
              ? { value: current.net - previous.net, text: signed(formatMoney(Math.abs(current.net - previous.net), currency, { compact: true }), current.net - previous.net) }
              : null
          }
          upIsGood
          prev={previous.label}
        />
        <StatTile
          label="Profit margin"
          value={margin === null ? "–" : `${Math.round(margin * 100)}%`}
          num={margin ?? undefined}
          hint="The share of money in that's left after money out."
          tone={margin !== null && margin < 0 ? "bad" : undefined}
          delta={
            margin !== null && prevMargin !== null
              ? { value: margin - prevMargin, text: signed(`${Math.abs(Math.round((margin - prevMargin) * 100))} pts`, margin - prevMargin) }
              : null
          }
          upIsGood
          prev={previous.label}
        />
        {/* The fifth tile spans both columns on phones so the grid doesn't end on a lone half. */}
        <StatTile
          label="Fixed costs a month"
          value={formatMoney(totalOverheads(overheads), currency, { compact: true })}
          num={totalOverheads(overheads)}
          hint={overheads.length ? `Your ${overheads.length} ${overheads.length === 1 ? "cost" : "costs"} from Margins & overheads.` : undefined}
          note={overheads.length ? undefined : "Add them in Margins & overheads"}
          className="col-span-2 xl:col-span-1"
        />
      </dl>

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="panel p-5 sm:p-6 xl:col-span-3">
          <SectionTitle title="Last 6 months" hint={`Money in and out per month, ending ${monthName}.`} />
          <div className="mt-5">
            <CashflowChart months={series} currency={currency} onLog={onLog} />
          </div>
        </section>
        <div className="xl:col-span-2">{helper}</div>
      </div>

      {/* Where this month's money went, next to the fixed costs that come every month. */}
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <section className="panel p-5 sm:p-6">
          <SectionTitle title="Where the money went" hint={`Spending by category in ${monthName}.`} />
          <div className="mt-5">
            {spending.length ? (
              <BarList rows={spending.map((s) => ({ label: s.category, amount: s.amount }))} currency={currency} />
            ) : (
              <p className="text-sm text-faint">No costs logged this month.</p>
            )}
          </div>
        </section>
        <BiggestFixedCosts />
      </div>

      <ActivitiesLog key={key} month={key} />
    </div>
  );
}

interface Delta {
  /** Signed change; only its sign is used, for direction and colour. */
  value: number;
  text: string;
}

function signed(text: string, value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${text}`;
}

function pctChange(now: number, before: number): Delta | null {
  if (before === 0) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return { value: pct, text: signed(`${Math.abs(pct)}%`, pct) };
}

function StatTile({
  label,
  value,
  num,
  tone,
  delta = null,
  upIsGood = true,
  prev = "",
  note,
  hint,
  className,
}: {
  label: string;
  value: string;
  /** The number behind the value, so a change ticks up or down. */
  num?: number;
  tone?: "bad";
  delta?: Delta | null;
  upIsGood?: boolean;
  prev?: string;
  note?: string;
  hint?: string;
  className?: string;
}) {
  const good = delta && Math.round(delta.value * 100) !== 0 ? delta.value > 0 === upIsGood : null;
  return (
    <div className={clsx("panel p-4", className)}>
      <dt className="flex items-center gap-1 text-xs font-medium text-muted">
        {label}
        {hint && <Hint label={`About ${label}`}>{hint}</Hint>}
      </dt>
      <dd className={clsx("mt-1.5 whitespace-nowrap text-xl font-bold", tone === "bad" && "text-alert")}>
        <Ticker value={value} num={num} />
      </dd>
      {note && <dd className="mt-1 text-xs text-faint">{note}</dd>}
      {delta && (
        <dd className={clsx("mt-1 flex items-center gap-1 text-xs", good === null ? "text-faint" : good ? "text-growth" : "text-alert")}>
          {delta.value >= 0 ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
          {delta.text} vs {prev}
        </dd>
      )}
    </div>
  );
}
