import type { TreasuryEntry } from "./types";

export function formatMoney(amount: number, currency: string, opts: { compact?: boolean } = {}) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: opts.compact ? 0 : 2,
    notation: opts.compact && Math.abs(amount) >= 10_000 ? "compact" : "standard",
  }).format(amount);
}

/** Local-date key like "2026-10". Entry dates are stored as local "YYYY-MM-DD". */
export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Totals for the calendar month containing `ref`. */
export function monthTotals(entries: TreasuryEntry[], ref = new Date()) {
  const prefix = monthKey(ref);
  let income = 0;
  let expenses = 0;
  for (const e of entries) {
    if (!e.date.startsWith(prefix)) continue;
    if (e.type === "income") income += e.amount;
    else expenses += e.amount;
  }
  return { income, expenses, net: income - expenses };
}
