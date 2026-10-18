"use client";

import { useState } from "react";
import clsx from "clsx";
import { CHART_COLORS } from "@/lib/categories";
import type { MonthSummary } from "@/lib/finance";
import { formatMoney } from "@/lib/money";

/** Rounds up to a clean axis maximum split into 4 steps (e.g. 3,700 → 4,000). */
function niceScale(max: number) {
  if (max <= 0) return { top: 4, step: 1 };
  const rough = max / 4;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  return { top: step * 4, step };
}

/** Money in vs money out per month: grouped columns with hover details and a table view. */
export function CashflowChart({ months, currency }: { months: MonthSummary[]; currency: string }) {
  const [asTable, setAsTable] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...months.map((m) => Math.max(m.income, m.expenses)));
  const { top, step } = niceScale(max);

  if (max === 0) {
    return (
      <p className="grid h-56 place-items-center rounded-xl border border-dashed border-fg/10 px-6 text-center text-sm text-muted">
        Nothing logged in these months yet. Add sales and costs to see your cashflow.
      </p>
    );
  }

  const ticks = [4, 3, 2, 1, 0].map((i) => i * step);
  const fmt = (n: number) => formatMoney(n, currency, { compact: true });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul className="flex gap-4 text-xs text-muted" aria-label="Legend">
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: CHART_COLORS.income }} aria-hidden /> Money in
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: CHART_COLORS.expense }} aria-hidden /> Money out
          </li>
        </ul>
        <button
          type="button"
          onClick={() => setAsTable(!asTable)}
          className="text-xs font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          {asTable ? "Show as chart" : "Show as table"}
        </button>
      </div>

      {asTable ? (
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-faint">
              <th className="py-2 font-medium">Month</th>
              <th className="py-2 text-right font-medium">Money in</th>
              <th className="py-2 text-right font-medium">Money out</th>
              <th className="py-2 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {months.map((m) => (
              <tr key={m.key} className="border-t border-line">
                <td className="py-2">{m.label}</td>
                <td className="py-2 text-right">{formatMoney(m.income, currency)}</td>
                <td className="py-2 text-right">{formatMoney(m.expenses, currency)}</td>
                <td className={clsx("py-2 text-right font-semibold", m.net < 0 && "text-alert")}>
                  {formatMoney(m.net, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-4 flex gap-3">
          {/* Y axis */}
          <div className="relative h-56 w-12 shrink-0 text-right text-[11px] tabular-nums text-faint">
            {ticks.map((t) => (
              <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / top) * 100}%` }}>
                {fmt(t)}
              </span>
            ))}
          </div>

          <div className="relative min-w-0 flex-1">
            {/* Gridlines: solid hairlines, one step off the surface */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-56" aria-hidden>
              {ticks.map((t) => (
                <div key={t} className="absolute inset-x-0 border-t border-fg/[0.07]" style={{ top: `${(1 - t / top) * 100}%` }} />
              ))}
            </div>

            <div className="relative flex h-56 items-end justify-around" role="list" aria-label="Money in and out by month">
              {months.map((m, i) => (
                <div
                  key={m.key}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${m.label}: money in ${formatMoney(m.income, currency)}, money out ${formatMoney(m.expenses, currency)}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="relative flex h-full flex-1 items-end justify-center gap-[2px] rounded-md outline-none transition-colors hover:bg-fg/[0.03] focus-visible:bg-fg/[0.05]"
                >
                  {(["income", "expenses"] as const).map((k) => (
                    <div
                      key={k}
                      className="w-[clamp(8px,2.2vw,24px)] rounded-t-[4px]"
                      style={{
                        height: `${(m[k] / top) * 100}%`,
                        minHeight: m[k] > 0 ? 2 : 0,
                        background: k === "income" ? CHART_COLORS.income : CHART_COLORS.expense,
                      }}
                    />
                  ))}

                  {active === i && (
                    <div
                      role="tooltip"
                      className={clsx(
                        "absolute bottom-full z-10 mb-2 w-40 rounded-xl bg-surface-800 p-3 text-xs shadow-2xl ring-1 ring-line",
                        i > months.length / 2 ? "right-0" : "left-0",
                      )}
                    >
                      <p className="font-semibold">{m.label}</p>
                      <TooltipRow color={CHART_COLORS.income} label="In" value={formatMoney(m.income, currency)} />
                      <TooltipRow color={CHART_COLORS.expense} label="Out" value={formatMoney(m.expenses, currency)} />
                      <p className="mt-1.5 flex justify-between border-t border-line pt-1.5">
                        <span className="text-muted">Net</span>
                        <span className={clsx("font-semibold tabular-nums", m.net < 0 && "text-alert")}>
                          {formatMoney(m.net, currency)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-around pt-2 text-[11px] text-faint">
              {months.map((m) => (
                <span key={m.key} className="flex-1 text-center">
                  {m.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <p className="mt-1 flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-muted">
        <span className="size-2 rounded-sm" style={{ background: color }} aria-hidden />
        {label}
      </span>
      <span className="tabular-nums">{value}</span>
    </p>
  );
}

/** One-series horizontal bars (e.g. spending by category), largest first, value at the tip. */
export function BarList({
  rows,
  currency,
  color = CHART_COLORS.expense,
}: {
  rows: { label: string; amount: number }[];
  currency: string;
  color?: string;
}) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-center gap-3 text-sm sm:grid-cols-[minmax(0,10rem)_1fr]">
          <span className="truncate text-muted">{r.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-3 rounded-r-[4px]" style={{ width: `${Math.max(2, (r.amount / max) * 78)}%`, background: color }} />
            <span className="shrink-0 text-xs tabular-nums text-ink">{formatMoney(r.amount, currency, { compact: true })}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
